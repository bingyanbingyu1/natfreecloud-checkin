const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// 确保日志目录存在
const logDir = path.join(__dirname, 'logs');
fs.ensureDirSync(logDir);

// 日志函数
function log(message) {
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    // 写入日志文件
    const logFile = path.join(logDir, `checkin-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logMessage + '\n');
}

// 签到函数
async function runCheckin(userId) {
    try {
        const checkinUrl = 'https://nat.freecloud.ltd/addons?_plugin=19&_controller=index&_action=index';
        
        log(`开始签到，用户ID: ${userId}`);
        
        // 方法1: 标准POST请求
        let response = await tryStandardRequest(checkinUrl, userId);
        
        // 如果失败，尝试其他方法
        if (response.status === 403 || response.blocked) {
            log('标准请求被拦截，尝试模拟浏览器请求...');
            response = await tryBrowserRequest(checkinUrl, userId);
        }
        
        if (response.status === 403 || response.blocked) {
            log('POST请求失败，尝试GET请求...');
            response = await tryGetRequest(checkinUrl, userId);
        }
        
        // 处理响应
        let result = {};
        try {
            if (response.data) {
                if (typeof response.data === 'string') {
                    // 检查是否是Cloudflare拦截页面
                    if (response.data.includes('Sorry, you have been blocked') || 
                        response.data.includes('Attention Required! | Cloudflare')) {
                        result = {
                            msg: 'IP被Cloudflare拦截',
                            status: response.status,
                            blocked: true
                        };
                    } else {
                        try {
                            result = JSON.parse(response.data);
                        } catch (e) {
                            result = { msg: response.data.substring(0, 200), status: response.status };
                        }
                    }
                } else {
                    result = response.data;
                }
            }
        } catch (error) {
            log(`解析响应失败: ${error.message}`);
            result = { msg: '响应解析失败', status: response.status, error: error.message };
        }
        
        log(`签到响应: ${JSON.stringify(result, null, 2)}`);
        
        const success = response.status === 200 && !result.blocked;
        const finalResult = {
            success,
            status: response.status,
            data: result,
            timestamp: new Date().toISOString(),
            userid: userId,
            method: response.method || 'unknown'
        };
        
        // 发送Telegram通知
        await sendTelegramNotification(finalResult);
        
        return finalResult;
        
    } catch (error) {
        log(`签到过程中出错: ${error.message}`);
        const errorResult = {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            userid: userId
        };
        
        await sendTelegramNotification(errorResult);
        return errorResult;
    }
}

// 标准POST请求
async function tryStandardRequest(url, userId) {
    try {
        const response = await axios({
            method: 'POST',
            url: url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Origin': 'https://nat.freecloud.ltd',
                'Referer': 'https://nat.freecloud.ltd/',
                'X-Requested-With': 'XMLHttpRequest'
            },
            data: `uid=${userId}`,
            timeout: 30000,
            validateStatus: () => true // 接受所有状态码
        });
        
        response.method = 'standard-post';
        return response;
    } catch (error) {
        log(`标准请求失败: ${error.message}`);
        return { status: 500, blocked: true, method: 'standard-post', error: error.message };
    }
}

// 浏览器模拟请求
async function tryBrowserRequest(url, userId) {
    try {
        // 先访问主页获取可能的cookies
        const homeResponse = await axios({
            method: 'GET',
            url: 'https://nat.freecloud.ltd/',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache'
            },
            timeout: 30000,
            validateStatus: () => true
        });
        
        log(`主页访问状态: ${homeResponse.status}`);
        
        // 提取cookies
        const cookies = homeResponse.headers['set-cookie'] || [];
        const cookieString = cookies.map(cookie => cookie.split(';')[0]).join('; ');
        
        // 使用cookies进行签到请求
        const response = await axios({
            method: 'POST',
            url: url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Origin': 'https://nat.freecloud.ltd',
                'Referer': 'https://nat.freecloud.ltd/',
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': cookieString
            },
            data: `uid=${userId}`,
            timeout: 30000,
            validateStatus: () => true
        });
        
        response.method = 'browser-simulation';
        return response;
    } catch (error) {
        log(`浏览器模拟请求失败: ${error.message}`);
        return { status: 500, blocked: true, method: 'browser-simulation', error: error.message };
    }
}

// GET请求尝试
async function tryGetRequest(url, userId) {
    try {
        const getUrl = `${url}&uid=${userId}`;
        const response = await axios({
            method: 'GET',
            url: getUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache'
            },
            timeout: 30000,
            validateStatus: () => true
        });
        
        response.method = 'get-request';
        return response;
    } catch (error) {
        log(`GET请求失败: ${error.message}`);
        return { status: 500, blocked: true, method: 'get-request', error: error.message };
    }
}

// 发送Telegram通知
async function sendTelegramNotification(result) {
    const { TG_BOT_TOKEN, TG_CHAT_ID } = process.env;
    
    if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
        log('未配置Telegram通知');
        return;
    }
    
    try {
        const statusEmoji = result.success ? '✅' : '❌';
        const statusText = result.data?.blocked ? '被拦截' : (result.success ? '成功' : '失败');
        
        const message = `${statusEmoji} natfreecloud 签到${statusText}\n\n` +
            `👤 用户ID: ${result.userid}\n` +
            `📊 状态码: ${result.status}\n` +
            `🔧 方法: ${result.method || 'unknown'}\n` +
            `💬 信息: ${result.data?.msg || result.error || '无返回信息'}\n` +
            `⏰ 时间: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}\n` +
            `🏃 运行环境: GitHub Actions\n` +
            (result.data?.blocked ? '\n⚠️ 请求被拦截，可能需要手动签到' : '');
        
        await axios({
            method: 'POST',
            url: `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`,
            data: {
                chat_id: TG_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            },
            timeout: 10000
        });
        
        log('Telegram通知发送成功');
    } catch (error) {
        log(`发送Telegram通知失败: ${error.message}`);
    }
}

// 主函数
async function main() {
    try {
        log('=== natfreecloud 自动签到开始 ===');
        
        // 获取用户ID
        const userId = process.env.MANUAL_USER_ID || process.env.UID;
        
        if (!userId) {
            throw new Error('未配置用户ID，请设置 UID 环境变量');
        }
        
        log(`环境信息:`);
        log(`- Node.js版本: ${process.version}`);
        log(`- 运行环境: GitHub Actions`);
        log(`- 用户ID: ${userId}`);
        log(`- Telegram配置: ${process.env.TG_BOT_TOKEN ? '已配置' : '未配置'}`);
        
        // 执行签到
        const result = await runCheckin(userId);
        
        log('=== 签到完成 ===');
        log(`最终结果: ${JSON.stringify(result, null, 2)}`);
        
        // 设置退出码
        if (!result.success) {
            process.exit(1);
        }
        
    } catch (error) {
        log(`主函数执行失败: ${error.message}`);
        process.exit(1);
    }
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { runCheckin, sendTelegramNotification };
