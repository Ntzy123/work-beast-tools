<script>
import { checkUpdate } from "@/utils/update"

export default {
  globalData: {},
  onLaunch: function () {
    console.log("App Launch")
    // 静默检查更新
    this.checkForUpdate()
  },
  onShow: function () {
    console.log("App Show")
  },
  onHide: function () {
    console.log("App Hide")
  },
  methods: {
    checkForUpdate() {
      checkUpdate({ silent: true }).catch(err => {
        console.error("启动版本检查失败:", err)
      })
    }
  }
}
</script>

<style>
/*每个页面公共css */
page {
  height: 100%;
  background: linear-gradient(180deg, #f5f7fa 0%, #c3cfe2 100%);
}
</style>
