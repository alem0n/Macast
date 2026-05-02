# Macast Extended

> **[Macast](https://github.com/xfangfang/Macast) 的增强分支** —— 一个跨平台的 DLNA 媒体渲染器，让你可以用手机投屏视频、图片和音乐到电脑上播放。

本分支在 Macast 基础上增加了**浏览器投屏接收器**、改进的触摸手势、以及架构简化，同时与上游项目保持完全兼容。

---

## 本分支的扩展功能

### 1. Web Renderer 2 — 浏览器投屏播放模块

核心功能：DLNA 投屏内容可以在局域网内的**任何现代浏览器**中观看。多个浏览器客户端可同时观看同一投屏，各自独立控制播放。

```
DLNA 客户端（手机/平板）
        │
        ▼
Macast（CherryPy + DLNA 协议）
        │  渲染器插件 → HTTP POST /api/cast
        ▼
Python aiohttp 服务端（端口 2554）
        │
        ├── REST API：投屏接收、状态查询、健康检查
        ├── WebSocket：向浏览器实时广播投屏内容
        └── 静态文件：React SPA
              │
              ▼
        浏览器客户端（Chrome / Firefox / Safari / Edge）
```

**关键设计决策：**

| 决策 | 原因 |
|---|---|
| Python aiohttp 服务端 | 消除 Node.js/npm 依赖；统一技术栈 |
| 单视频模式 | 新投屏链接覆盖旧链接，不维护播放历史 |
| 各自独立播放 | 各客户端独立控制播放/暂停/进度/音量 |
| 格式自动识别 | `.mp4` → mp4，`.webm` → webm，`.m3u8` → hls，`.mpd` → dash |
| HLS 通过 hls.js | Safari 原生支持，其他浏览器按需加载 hls.js |

**功能特性：**
- **多客户端** — 任意数量的浏览器可同时连接
- **REST API** — `POST /api/cast`、`GET /api/cast`、`GET /api/users`、`GET /api/status`
- **WebSocket** — 实时投屏广播、在线用户状态、心跳检测（30s）
- **响应式 UI** — 暗色主题、移动端适配、全屏支持
- **Redux 状态管理** — 可预测的播放器 + 用户状态
- **自动打开浏览器**（切换渲染器时，支持 macOS/Windows/Linux）

**与 Macast 的集成 — 零修改核心代码：**

Web Renderer 2 作为 Macast 渲染器插件运行，利用已有的插件发现机制：

```
右键托盘图标 → Settings → Renderers → Web Renderer 2
```

Python `WebRenderer2` 类：
1. 首次使用时通过 `subprocess` 启动 aiohttp 服务
2. 通过 HTTP POST 将 DLNA 投屏 URL 转发到 `127.0.0.1:2554/api/cast`
3. 切换到其他渲染器或退出时终止服务进程

作为 PyInstaller exe 运行时，服务会自动从 `sys._MEIPASS` 释放，用户无需手动安装任何东西。

完整文档：[`web_renderer_2/README.md`](web_renderer_2/README.md)

### 2. 触摸手势改进

- **拖动进度条快进快退**（替代滑动切换视频）
- **即时点击暂停/播放** — 无双击延迟
- **智能点击处理** — 仅在控制栏可见时响应点击切换，防止全屏观看时误触

### 3. Python aiohttp 服务端

Web Renderer 2 后端已从 **Node.js/Express/TypeScript** 重写为 **Python aiohttp**，完全消除了 Node.js 和 npm 依赖。服务端代码位于 `web_renderer_2/server_py/`：

| 文件 | 说明 |
|---|---|
| `server.py` | aiohttp 应用：REST 路由、WebSocket 处理、静态文件服务 |
| `cast_service.py` | URL 验证、格式检测、内存投屏存储 |
| `config.py` | 常量：端口=2554、心跳间隔、超时设置 |

### 4. 其他改进

- 修复并扩展键盘快捷键
- URL 健康检查器，投屏前验证链接可用性
- 简化的部署流程 — `deploy.ps1` 支持 staging 模式用于 PyInstaller 打包

---

## 快速开始

```bash
# 标准 Macast（mpv 渲染器）
source .venv/Scripts/activate
python Macast.py

# 切换到 Web Renderer 2
# → 右键托盘图标 → Settings → Renderers → Web Renderer 2
# → 浏览器自动打开 http://127.0.0.1:2554
```

PyInstaller 构建（Windows）：

```powershell
.\build.ps1                       # 标准构建（含 mpv）
.\build.ps1 -WithWebRenderer      # 含 Web Renderer 2
.\build.ps1 -SkipMpv -WithWebRenderer  # 组合参数
```

---

---

# 原版 Macast README

<img align="center" src="macast_slogan.png" alt="slogan" height="auto"/>

# Macast

[![visitor](https://visitor-badge.glitch.me/badge?page_id=xfangfang.Macast)](https://github.com/xfangfang/Macast/releases/latest)
[![stars](https://img.shields.io/badge/dynamic/json?label=github%20stars&query=stargazers_count&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fxfangfang%2FMacast)](https://github.com/xfangfang/Macast)
[![plugins](https://shields-staging.herokuapp.com/github/directory-file-count/xfangfang/Macast-plugins?type=dir&label=plugins)](https://github.com/xfangfang/Macast-plugins)
[![build](https://img.shields.io/github/workflow/status/xfangfang/Macast/Build%20Macast)](https://github.com/xfangfang/Macast/actions/workflows/build-macast.yaml)
[![mac](https://img.shields.io/badge/MacOS-10.14%20and%20higher-lightgrey?logo=Apple)](https://github.com/xfangfang/Macast/releases/latest)
[![windows](https://img.shields.io/badge/Windows-10-lightgrey?logo=Windows)](https://github.com/xfangfang/Macast/releases/latest)
[![linux](https://img.shields.io/badge/Linux-Xorg-lightgrey?logo=Linux)](https://github.com/xfangfang/Macast/releases/latest)

[README_EN](README.md)

Macast是一个跨平台的 **菜单栏\状态栏** 应用，用户可以使用电脑接收发送自手机的视频、图片和音乐，支持主流视频音乐软件和其他任何符合DLNA协议的投屏软件。

## 安装

进入页面选择对应的操作系统下载即可，应用使用方法及截图见下方。

- ### MacOS || Windows || Debian

  下载地址1:  [Macast 最新正式版 github下载](https://github.com/xfangfang/Macast/releases/latest)

  下载地址2:  [Macast 最新正式版 gitee下载（上面访问无效可使用此备用链接）](https://gitee.com/xfangfang/Macast/releases/)

- ### 包管理
  你也可以使用包管理器安装macast
  ```shell
  # 需要 python>=3.6
  pip install macast
  ```

  请查看我们的wiki页面获取更多的包管理相关信息（如：aur）: [Macast/wiki/Installation#package-manager](https://github.com/xfangfang/Macast/wiki/Installation#package-manager)
  Linux用户使用包管理器安装时运行可能会有问题，建议替换如下两个库为我修改过的库（分别负责`菜单显示`与`文本复制`）：

  ```shell
  pip install git+https://github.com/xfangfang/pystray.git
  pip install git+https://github.com/xfangfang/pyperclip.git
  ```

  **Linux用户如果安装或运行有问题，可以查看 [这里](https://github.com/xfangfang/Macast/wiki/Installation#linux)**

- ### 从源码构建或运行

  请参考：[Macast 开发文档](docs/Development.md)

## 使用方法

- **普通用户**
  1. 打开应用后，**菜单栏 \ 状态栏 \ 任务栏** 会出现一个图标，这时你的设备就可以接收来自同一局域网的DLNA投放了。

- **进阶用户**
  1. 通过手动加载 [Macast插件](https://gitee.com/xfangfang/Macast-plugins), Macast可以支持调用其他播放器，如：IINA、PotPlayer等等，或适配国内各家私有的DLNA协议.
  2. 在应用内点击高级设置，可以直接在内置的插件商店中快速下载插件（使用github仓库地址，如果网络条件不好刷新不出来，那么还是通过手动加载的方式下载吧）
  3. 支持修改默认播放器的快捷键或其他参数，见：[#how-to-set-personal-configurations-to-mpv](https://github.com/xfangfang/Macast/wiki/FAQ#how-to-set-personal-configurations-to-mpv)

- **程序员**
  1. 可以依照教程完成自己的脚本，快速地适配到你喜欢的播放器，或者增加一些新的功能插件，比如：边下边看，自动复制视频链接等等。教程和一些示例代码在：[Macast/wiki/Custom-Renderer](https://github.com/xfangfang/Macast/wiki/Custom-Renderer)
  2. 也可以参考 [nirvana](https://github.com/xfangfang/Macast-plugins/tree/main/nirvana) 快速适配第三方魔改的DLNA协议。

欢迎大家提交代码到[Macast插件](https://github.com/xfangfang/Macast-plugins)。
**注意：不要轻易加载非官方仓库下载的插件，这里"插件"本身是可以运行在电脑上的任意代码，不建议加载非官方提供的插件。**

## 开发计划

- [x] 完成第一版应用，支持MacOS
- [x] 添加对Linux和Windows的支持
- [x] 完善协议，增强软件适配性
- [x] 统一MacOS与其他平台的UI
- [x] 添加多播放器支持
- [x] 添加多网卡支持
- [x] 添加自定义端口和自定义播放器名称
- [ ] 改进目前的播放器控制页面
- [x] 增加插件商店
- [x] 添加bilibili弹幕投屏
- [ ] 支持airplay

## 出现问题的可能原因及解决办法（更详细内容见项目的wiki）

0. 应用闪退
    大概率是由windows的hyper-v占用端口号导致的，建议修改hyper-v占用的端口号范围或修改本应用的启动端口号（[Macast配置文件位置](https://github.com/xfangfang/Macast/wiki/FAQ#where-is-the-configuration-file-located)）
1. 无法搜索到Macast——被电脑防火墙拦截
    手机尝试访问 http://电脑ip:1068，如:192.168.1.123:1068 如果出现helloworld 等字样排除问题。
    *具体端口号见应用菜单设置的第一项，如果没有则为默认的1068*
2. 无法搜索到Macast——路由器问题
    路由器需要开启UPnP，关闭ap隔离，确认固件正常（部分openwrt有可能有问题）
3. 无法搜索到Macast——手机软件有问题
    可以重启软件或更换软件尝试，或向其他投屏接收端电视测试
    尝试在搜索页面等待久一点（最多1分钟如果搜不到那应该就是别的问题了）
    如操作系统为IOS，注意要开启软件的**本地网络发现**权限
4. 无法搜索到Macast——网络问题
    请确定手机和电脑处在同一网段下，比如说：电脑连接光猫的网线，手机连接路由器wifi，这种情况大概率是不在同一网段的，可以查看手机和电脑的ip前缀是否相同。
5. 无法搜索到Macast——其他未知问题
    尝试在同一局域网手机投电视，如果可以正常投说明问题还是出在电脑端，继续检查电脑问题或查看如何报告bug

## 对于反馈问题的说明

1. 先确保自己有认真读过使用说明
2. 在提issue时，请及时地回复作者的消息，太多人提完问题或者反馈就消失，提之前先看别人问过没有，提之后积极参与讨论。如果您做不到回复issue，请不要随便提issue浪费开发者的时间。
3. 遇到问题不要只说现象，请附带所有你认为能帮助开发者解决问题的信息，这会让开发者认为你很聪明，且极大的帮助加快解决你的问题与节省开发者的时间。
4. 如果你遇到了某个问题，请优先考虑是自己没有看使用说明，比如我遇到过很多很多遭遇了投屏搜索不到的用户，直接评论说，"这个软件用不了"。用不了那是我编出来逗你玩的吗？检查一下自己的防火墙OK？
5. 如果你不能自己去写，请不要提出那种很难实现的需求，开发者愿意解决的是："我有个需求，讨论一下要怎么实现" 而不是 "可以帮我给这个软件加上***功能吗？"

## 如何报告bug
准备以下信息，推荐到Github报告问题，点击 **[new issue](https://github.com/xfangfang/Macast/issues/new/choose)** 去反馈问题：
1. 你的电脑系统类型和版本：如Win10 20h2
2. 你使用的手机系统和软件：如 安卓 bilibili
3. bug复现：如何复现bug与bug是否可以稳定复现
4. 程序运行的log（复现问题时候的log）：
  - windows下载debug版应用, 拖入cmd执行，复现问题后，关闭应用，ctrl-a全选复制：[download debug](https://github.com/xfangfang/Macast/releases/latest)
  - mac 终端输入：`/Applications/Macast.app/Contents/MacOS/Macast` 回车运行，复现问题后，关闭应用，复制log
  - linux 安装deb后，命令行运行 `macast` \ 或直接从源码运行 \ 或包管理安装后命令行运行 `macast-cli`，复现问题后，关闭应用，复制log

## 用户反馈

点击链接加入群聊【小方的软件工地】：[983730955](https://jq.qq.com/?_wv=1027&k=4ioK8gQs)

当然也可以考虑捐赠 ~~获得贵宾售后服务（开玩笑）~~ 支持Macast和他的开发者们为了这个软件熬过的日日夜夜

<img align="center" width="400" src="sponsorships.png" alt="sponsorships" height="auto"/>

<img align="center" width="400" src="https://service-65diwogz-1252652631.bj.apigw.tencentcs.com/release/sponsor.svg" alt="sponsors" height="auto"/>

## 使用截图
*如果系统设置为中文，Macast会自动切换中文界面*

在投放视频或其他媒体文件后，可以点击应用图标复制媒体下载链接
<img align="center" width="400" src="https://gitee.com/xfangfang/xfangfang/raw/master/assets/img/macast/copy_uri.png" alt="copy_uri" height="auto"/>

支持选择第三方播放器
<img align="center" width="400" src="https://gitee.com/xfangfang/xfangfang/raw/master/assets/img/macast/select_renderer.png" alt="select_renderer" height="auto"/>

## 相关链接

[UPnP™ Device Architecture 1.1](http://upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf)

[UPnP™ Resources](http://upnp.org/resources/upnpresources.zip)

[UPnP™ ContentDirectory:1 service](http://upnp.org/specs/av/UPnP-av-ContentDirectory-v1-Service.pdf)

[UPnP™ MediaRenderer:1 device](http://upnp.org/specs/av/UPnP-av-MediaRenderer-v1-Device.pdf)

[UPnP™ AVTransport:1 service](http://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf)

[UPnP™ RenderingControl:1 service](http://upnp.org/specs/av/UPnP-av-RenderingControl-v1-Service.pdf)

[python-upnp-ssdp-example](https://github.com/ZeWaren/python-upnp-ssdp-example)
