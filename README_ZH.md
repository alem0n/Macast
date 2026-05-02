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


😂 **请尽量使用英语在Github交流，如果喜欢的话可以点个star关注后续更多协议支持的更新**



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

  #### 环境要求

  - Python >= 3.6
  - mpv（媒体播放必需）— Windows [下载](https://github.com/shinchiro/mpv-winbuild-cmake/releases)，macOS `brew install mpv`，Linux `sudo apt install mpv`
  - Node.js >= 18 和 npm（仅 Web Renderer 2 需要）

  #### 设置虚拟环境

  ```bash
  python -m venv .venv
  source .venv/Scripts/activate   # Windows (Git Bash)
  # 或: .venv\Scripts\activate    # Windows (CMD)
  # 或: source .venv/bin/activate # macOS / Linux

  pip install --upgrade pip
  pip install -r requirements/common.txt
  pip install -e .
  ```

  #### 开发模式运行

  ```bash
  .venv/Scripts/python Macast.py
  # Linux: export PYSTRAY_BACKEND=gtk && .venv/bin/python Macast.py
  ```

  #### PowerShell 构建（Windows，推荐）

  ```powershell
  .\build.ps1                       # 完整构建（含 mpv）
  .\build.ps1 -SkipMpv              # 不含 mpv（~24MB exe）
  .\build.ps1 -Clean:$false         # 跳过清理旧构建
  .\build.ps1 -WithWebRenderer      # 含 Web Renderer 2
  .\build.ps1 -SkipMpv -WithWebRenderer  # 组合参数
  ```

  脚本自动处理：venv 激活、依赖安装、.po→.mo 编译、清理、PyInstaller 打包，可选构建并打包 Web Renderer 2 子项目（Node.js 服务端 + React 客户端）。

  #### PyInstaller 手动构建

  ```bash
  pip install pyinstaller polib

  # 构建前编译 .po 到 .mo（国际化）
  .venv/Scripts/python -c "
  import polib
  for lang in ['zh_CN', 'fi', 'it']:
      po = polib.pofile(f'i18n/{lang}/LC_MESSAGES/macast.po')
      po.save_as_mofile(f'i18n/{lang}/LC_MESSAGES/macast.mo')
  "

  # 清理旧构建
  rm -rf build dist Macast.spec

  # Windows 构建（使用 ; 作为分隔符）
  pyinstaller --noconfirm -F -w \
    --additional-hooks-dir=. \
    --add-data="macast/.version;." \
    --add-data="macast/xml;macast/xml" \
    --add-data="i18n;i18n" \
    --add-data="macast/assets;macast/assets" \
    --add-binary="bin/mpv.exe;bin" \
    --icon=macast/assets/icon.ico \
    Macast.py

  # Linux/macOS（使用 : 作为分隔符）
  pyinstaller --noconfirm -F -w \
    --additional-hooks-dir=. \
    --add-data="macast/.version:." \
    --add-data="macast/xml:macast/xml" \
    --add-data="i18n:i18n" \
    --add-data="macast/assets:macast/assets" \
    Macast.py
  ```

  PyInstaller 关键参数：
  - `-F`：单文件输出
  - `-w`：无控制台窗口（GUI 应用）
  - `--additional-hooks-dir=.`：加载 `hook-pystray.py` 处理隐藏导入
  - `--add-data`：使用目录模式（`macast/xml;macast/xml`）递归包含所有文件
  - 输出：`dist/Macast.exe`（含 mpv 约 68MB，不含约 24MB）

  #### macOS (py2app)

  ```bash
  pip install py2app
  python setup.py py2app
  cp -R bin dist/Macast.app/Contents/Resources/
  ```

  ### Web Renderer 2 — 浏览器投屏播放模块

  Web Renderer 2 是一个独立的浏览器投屏观看模块，在 `0.0.0.0:2554` 端口部署 Node.js + React 服务，允许多个浏览器客户端同时观看 DLNA 投屏内容，各客户端独立控制播放。

  **流程**：`DLNA投屏 → Macast (Renderer插件) → HTTP POST → Node.js → WebSocket → 浏览器播放`

  #### 快速部署（开发环境）

  ```powershell
  # 构建 + 打包 + 安装依赖
  .\web_renderer_2\deploy.ps1

  # 跳过构建（已手动 npm run build）
  .\web_renderer_2\deploy.ps1 -SkipBuild

  # 跳过 npm install
  .\web_renderer_2\deploy.ps1 -SkipNpmInstall
  ```

  #### 手动部署

  ```bash
  cd web_renderer_2/client && npm install && npm run build
  cd ../server && npm install && npm run build

  # 复制到 Macast 配置目录
  # Windows: %LOCALAPPDATA%\xfangfang\Macast\
  # macOS: ~/Library/Application Support/Macast/
  # Linux: ~/.config/Macast/

  cp -r server/dist/* "$SETTING_DIR/web_renderer_2_app/server/dist/"
  cp -r client/dist/* "$SETTING_DIR/web_renderer_2_app/client/dist/"
  cp server/package.json "$SETTING_DIR/web_renderer_2_app/server/"
  cd "$SETTING_DIR/web_renderer_2_app/server" && npm install --omit=dev

  cp web_renderer_2/macast_renderer.py "$SETTING_DIR/renderer/web_renderer_2.py"
  ```



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
**注意：不要轻易加载非官方仓库下载的插件，这里“插件”本身是可以运行在电脑上的任意代码，不建议加载非官方提供的插件。**


## 开发文档

### 架构

```
Macast.py (入口，语言环境设置，mpv路径配置)
  └── gui() / cli()  [macast/macast.py]
        └── Macast(App) — 系统托盘应用，插件管理器，设置菜单
              └── Service [macast/server.py] — CherryPy HTTP 服务
                    ├── AutoPortServer — 端口回退 HTTP 服务
                    ├── SSDPPlugin [macast/plugin.py] → SSDPServer [macast/ssdp.py]
                    ├── RendererPlugin → MPVRenderer [macast_renderer/mpv.py]
                    ├── ProtocolPlugin → DLNAProtocol [macast/protocol.py]
                    └── DLNAHandler — SOAP/事件端点（挂载于 /）
```

### 核心文件

| 文件 | 说明 |
|---|---|
| `Macast.py` | 入口：语言环境、mpv 路径、启动 GUI |
| `macast/macast.py` | 主应用类、插件管理器、托盘菜单 |
| `macast/gui.py` | 跨平台 GUI 抽象（rumps/pystray） |
| `macast/protocol.py` | DLNA/UPnP 协议、SOAP 处理、状态机 |
| `macast/server.py` | CherryPy HTTP 服务、Service 编排器 |
| `macast/plugin.py` | CherryPy 插件（Renderer, Protocol, SSDP） |
| `macast/ssdp.py` | SSDP/UDP 多播发现 |
| `macast/utils.py` | 设置持久化、IP 检测、工具函数 |
| `macast/renderer.py` | 抽象渲染器基类 |
| `macast_renderer/mpv.py` | mpv 渲染器：进程管理、JSON IPC |
| `web_renderer_2/` | Web Renderer 2：浏览器投屏模块 |

### 启动流程

1. `Macast.py`：清理日志 → 加载语言环境 → 设置 mpv 路径 → 调用 `gui()`
2. `gui()`：创建 `MPVRenderer` + `DLNAProtocol` → 实例化 `Macast(App)`
3. `Macast.__init__()`：创建 `MacastPluginManager`，加载设置，创建 `Service`，构建托盘菜单
4. `Service.run()`：启动 AutoPortServer → SSDPPlugin → RendererPlugin → ProtocolPlugin → SSDP 定时器 → `cherrypy.engine.block()`

### HTTP API 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/description.xml` | UPnP 设备描述 |
| `GET` | `/` | 设置页面（Vue.js SPA） |
| `GET` | `/api?query=log` | 返回日志内容 |
| `GET` | `/api?query=launch-param` | 返回当前设置 JSON |
| `POST` | `/api` | 保存设置或安装插件 |
| `POST` | `/{service}/action` | DLNA SOAP 操作 |
| `SUBSCRIBE` | `/{service}/event` | UPnP 事件订阅 |

### DLNA SOAP 端点

| 服务路径 | 操作 |
|---|---|
| `/AVTransport/action` | GetCurrentTransportActions, GetMediaInfo, GetPositionInfo, GetTransportInfo, Next, Pause, Play, Previous, Seek, SetAVTransportURI, Stop 等 |
| `/RenderingControl/action` | GetMute, GetVolume, SetMute, SetVolume 等 |
| `/ConnectionManager/action` | GetCurrentConnectionInfo, GetProtocolInfo, GetCurrentConnectionIDs |

### mpv IPC 协议

通过 JSON IPC 与 mpv 通信：Windows 使用命名管道（`\\.\pipe\macast_mpvsocket{rand}`），macOS/Linux 使用 Unix 域套接字（`/tmp/macast_mpvsocket{rand}`）。

主要命令：`loadfile`、`set_property`、`seek`、`stop`、`observe_property`。

### 插件系统

自定义插件放置于 `{SETTING_DIR}/renderer/` 或 `{SETTING_DIR}/protocol/`。插件元数据通过 XML 风格注释声明：

```python
# <macast.title>我的插件</macast.title>
# <macast.renderer>MyRenderer</macast.renderer>
# <macast.platform>darwin,win32,linux</macast.platform>
```

### 国际化

基于 Gettext，PO 文件位于 `i18n/{locale}/LC_MESSAGES/macast.po`，打包前需编译为 `.mo`：

```bash
pip install polib
python -c "
import polib
for lang in ['zh_CN', 'fi', 'it']:
    po = polib.pofile(f'i18n/{lang}/LC_MESSAGES/macast.po')
    po.save_as_mofile(f'i18n/{lang}/LC_MESSAGES/macast.mo')
"
```

### 设置系统

设置存储于 `~/.config/Macast/macast_setting.json`（通过 `appdirs` 适配各平台）：

| 键 | 默认值 | 说明 |
|---|---|---|
| `DLNA_FriendlyName` | "Macast(HOSTNAME)" | DLNA 设备名称 |
| `ApplicationPort` | 0（自动） | HTTP 服务端口 |
| `Macast_Renderer` | "MPV Renderer" | 当前渲染器插件 |
| `Macast_Protocol` | "DLNA Protocol" | 当前协议插件 |
| `CheckUpdate` | 1 | 自动检查更新 |
| `StartAtLogin` | 0 | 开机启动 |

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
2. 无法搜索到Macast——被电脑防火墙拦截  
    手机尝试访问 http://电脑ip:1068，如:192.168.1.123:1068 如果出现helloworld 等字样排除问题。  
    *具体端口号见应用菜单设置的第一项，如果没有则为默认的1068*
2. 无法搜索到Macast——路由器问题  
    路由器需要开启UPnP，关闭ap隔离，确认固件正常（部分openwrt有可能有问题）
4. 无法搜索到Macast——手机软件有问题  
    可以重启软件或更换软件尝试，或向其他投屏接收端电视测试
    尝试在搜索页面等待久一点（最多1分钟如果搜不到那应该就是别的问题了）
    如操作系统为IOS，注意要开启软件的**本地网络发现**权限
5. 无法搜索到Macast——网络问题  
    请确定手机和电脑处在同一网段下，比如说：电脑连接光猫的网线，手机连接路由器wifi，这种情况大概率是不在同一网段的，可以查看手机和电脑的ip前缀是否相同。
6. 无法搜索到Macast——其他未知问题  
    尝试在同一局域网手机投电视，如果可以正常投说明问题还是出在电脑端，继续检查电脑问题或查看如何报告bug

## 对于反馈问题的说明

  1. 先确保自己有认真读过使用说明
  2. 在提issue时，请及时地回复作者的消息，太多人提完问题或者反馈就消失，提之前先看别人问过没有，提之后积极参与讨论。如果您做不到回复issue，请不要随便提issue浪费开发者的时间。
  3. 遇到问题不要只说现象，请附带所有你认为能帮助开发者解决问题的信息，这会让开发者认为你很聪明，且极大的帮助加快解决你的问题与节省开发者的时间。
  4.  如果你遇到了某个问题，请优先考虑是自己没有看使用说明，比如我遇到过很多很多遭遇了投屏搜索不到的用户，直接评论说，“这个软件用不了”。用不了那是我编出来逗你玩的吗？检查一下自己的防火墙OK？
  5. 如果你不能自己去写，请不要提出那种很难实现的需求，开发者愿意解决的是：“我有个需求，讨论一下要怎么实现” 而不是 “可以帮我给这个软件加上***功能吗？”

## 如何报告bug
  准备以下信息，推荐到Github报告问题，点击 **[new issue](https://github.com/xfangfang/Macast/issues/new/choose)** 去反馈问题：
  1. 你的电脑系统类型和版本：如Win10 20h2
  2. 你使用的手机系统和软件：如 安卓 bilibili
  3. bug复现：如何复现bug与bug是否可以稳定复现
  4. 程序运行的log（复现问题时候的log）：  
    - windows下载debug版应用, 拖入cmd执行，复现问题后，关闭应用，ctrl-a全选复制：[download debug](https://github.com/xfangfang/Macast/releases/latest)  
    - mac 终端输入：`/Applications/Macast.app/Contents/MacOS/Macast` 回车运行，复现问题后，关闭应用，复制log  
    - linux 安装deb后，命令行运行 `macast` \\ 或直接从源码运行 \\ 或包管理安装后命令行运行 `macast-cli`，复现问题后，关闭应用，复制log  

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
