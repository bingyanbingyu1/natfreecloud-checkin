const { runCheckin } = require('./checkin');

// 测试脚本
async function test() {
    console.log('开始测试签到功能...');
    
    // 模拟环境变量
    process.env.UID = process.env.UID || '123'; // 请替换为实际的用户ID
    
    try {
        const result = await runCheckin(process.env.UID);
        console.log('测试结果:', JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('✅ 测试成功');
        } else {
            console.log('❌ 测试失败');
        }
    } catch (error) {
        console.error('测试出错:', error.message);
    }
}

if (require.main === module) {
    test();
}
