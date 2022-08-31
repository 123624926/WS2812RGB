const { join } = require('path');
const onDocumentInteraction = require("common/utils/onDocumentInteraction")

function execStart () {
    try {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        const uuidv1 = require("uuid/v1");
        const getMemory = require('common/utils/hardware/memory');
        const getDNSList = require('common/utils/getDnsServerList');
        const config = require(join(__dirname, './conf.json'));
        const analysisSdk = require('@hetao/analysis-node-sdk').default;
        // const DcReporter = require('@hetao/datacenter-node-reporter').default;
        let uuid = localStorage["_app_caching_uuid"];
        if (!uuid) {
            uuid = uuidv1();
	        localStorage.setItem("_app_caching_uuid", uuid);
        }
        analysisSdk.init({
            uuid,
            env: config.env === "testing" ? 'testing' : 'production',
            project: "learning",
	        product: "coding",
            userId: localStorage.userId || "-1",
            version: config.version
        });
        // const dcReporter = new DcReporter();
        // dcReporter.init({
        //     product: 'htcoding', // 项目名称 
        //     env: config.env === "testing" ? 'testing' : 'production', //当前的环境testing  or  production   此项选择只针对数仓的埋点地址，对神策无影响
        //     version: config.version,// 埋点项目版本，实际值使用客户端开发迭代的版本，即埋点版本和客户端版本保持一致
        //     userId: localStorage.userId || "-1", //用户的id 没有userId时可不传，等后续获取到userId后 通过update方法传入
        //     // optional
        //     requestingMethod: "POST", // GET, POST，不建议使用GET，大数据段时会请求失败
        //     logs: true, // 是否打印log 包括 warning 和 error
        // });
        // dcReporter.trackLaunch();
        if (nw.App.setCrashReportData) {
            try {
                nw.App.setCrashReportData(JSON.stringify({
                    userId: userId,
                    uuid,
                    env,
                    eventTime: Date.now(),
                    nodeVersion: process.version
                }))
            } catch(e) {
                e.message = `failed setCrashReportData${e.message}`
                console.error(e)
            }
        }
        // global.DcReporter = DcReporter;
        // global.dcReporter = dcReporter;
        global.appConfig = config;
        global.analysisSdk = analysisSdk;
        global.analysisSdkUid = uuid;
        global.isEnabledCameraPermission = true;
        try {
            const reqTrack = require('common/services/track');
            reqTrack("learning_node_start", {
                memoryInfo: getMemory,
                dnsLocalServerList: getDNSList().localServer.join("\n")
            });
        } catch (e) { }
        const updateApplication = require(join(__dirname, './scripts/index'));
        global.checkoutUpdate = updateApplication.checkUpdate;
        updateApplication.start();
    } catch (err) {
        console.error(err);
        nw.Window.open('./pages/anomalyError.html', {
            width: 800,
            height: 600
        }, (nwWindow) => {
            const d = nwWindow.window.document;
            onDocumentInteraction(d, () => {
                let errStr = err.toString();
                if (process.platform === 'darwin') {
                    errStr+='<br /> <br /> Mac用户请拖入应用程序安装后使用！'
                }
                nwWindow.window.postMessage(errStr);
                const reqTrack = require('common/services/track');
                // eventID, event;
                reqTrack("learning_node_fail");
            });
        });
    }
}

execStart();
