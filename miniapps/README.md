# 微信 / 支付宝 / 抖音入口准备 — 0.7.0

**状态：网页容器入口scaffold，未进行平台构建、平台审核或手机扫码验收。** 这些目录不是已上线的小程序。当前已验证的核心入口是Windows本机浏览器；PWA具备基础，但跨设备安装待验收。

每个平台有独立app配置、首页模板和 `config.js`。默认网址为空，启动时只显示未配置提示；不会连接外部网址。配置项不得包含任何患者资料、身份令牌或解密密钥。二维码/scene参数不能选择任意网址，入口固定读取开发者配置，避免开放重定向。

## 多入口亮点中的定位

本项目将Windows一键启动、浏览器直接使用与可选小程序、PWA入口作为低门槛使用设计。**本目录对应“可选小程序入口，待接入/待平台验证”**，不是已经部署的产品。手机浏览器可作为使用方式，但当前本机包仅接受回环访问，仍需维护者部署可访问服务。完整便携包与GitHub源码包的区别见[中文README](../README.zh-CN.md)。

These optional WeChat, Alipay and Douyin entry points are integration scaffolds only. No live mini-program, approved platform build or verified QR entry is supplied. Use the browser on the host computer today; mobile access requires a reachable deployed service. PWA installation remains separately unverified.

## 后续接入顺序

1. 为平台申请符合当前类别和网页容器资格的主体账号及AppID，确定是否需要改用真正原生记录界面。不要假定个人主体均可使用web-view。
2. 按ARCHITECTURE部署门槛建立HTTPS网页服务、账号/机构治理和审计，完成安全评估。当前本机服务器没有直接公网部署开关。
3. 按平台控制台配置业务域名、根目录校验文件、隐私说明和服务类别；导入对应目录到官方开发者工具，由工具配置实际AppID。
4. 在 `config.js` 填固定HTTPS网站URL。入口只验证协议和基本结构，业务域名真实性和平台许可仍需人工/平台核验。
5. 真机检查：三平台分别测试扫码、邮箱登录、八语言、侧别、剂量、跨午夜、返回/前进、缓存、掉线、撤销授权和过期会话。小程序web-view的缓存/生命周期不同于桌面浏览器，不承诺PWA离线能力完全一致。
6. 按各平台规定提交体验/审核，使用该平台实际生成的原生入口码；记录App版本、系统、平台基础库和结果。普通网页QR不等于原生码。

## 本次实际提供与未提供

提供：三套最小网页容器入口源码、固定URL配置、未配置提示、无敏感URL参数设计、接入和验收清单。

未提供：AppID/密钥、真实发布域名、二维码平台注册、原生登录与患者身份映射、原生表单UI、原生推送、平台构建产物/审核通过证明、真实扫码验证。这些需要后续条件，不能由本地生成假的平台结果替代。

## 官方资料

- [微信web-view组件](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html)：链接供后续核对；本次工具未能读取该页面正文，微信主体/准入条件须在接入时重新确认。
- [支付宝官方文档仓库：web-view常见问题](https://github.com/AlipayDocs/open-docs/blob/main/mini/component/%E5%9F%BA%E7%A1%80%E7%BB%84%E4%BB%B6/%E5%BC%80%E6%94%BE%E7%BB%84%E4%BB%B6/web-view/web-view%20%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98.md)：本次查阅2026-10-10；需要HTTPS业务域名等配置。
- [抖音开发web-view组件](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/tutorial/basic-ability/web-view-component)：本次查阅2026-10-10；文档说明个人类型暂不支持该能力。

平台政策会变化。上述准备代码不代表平台准入承诺。
