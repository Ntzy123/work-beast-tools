// 【APP 兼容性】导入 TextEncoder polyfill，解决 qrcode 库在 APP 端的兼容性问题
import 'text-encoding-polyfill';

import {
	createSSRApp
} from "vue";
import App from "./App.vue";
export function createApp() {
	const app = createSSRApp(App);
	return {
		app,
	};
}
