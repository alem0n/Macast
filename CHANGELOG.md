# Changelog

## [0.9.0](https://github.com/alem0n/Macast/compare/Macast-v0.8.0...Macast-v0.9.0) (2026-07-03)


### Features

* add CI/CD workflows (publish, ci, release-please) ([5ccd63c](https://github.com/alem0n/Macast/commit/5ccd63cb2478addfd36644382623318c3d03594a))
* build.ps1 improvements and Web Renderer 2 server updates ([91b957a](https://github.com/alem0n/Macast/commit/91b957a7d80a32754a46b01a738857286b46512f))
* bundle Web Renderer 2 in CI build (React client + Python server) ([9761161](https://github.com/alem0n/Macast/commit/9761161bff46e966efd9929857b3247ed998464d))
* fix keyboard shortcuts, add touch gestures and URL health checker ([c19c878](https://github.com/alem0n/Macast/commit/c19c8782c5adab74983e00b956999f61769c1cb5))
* integrate Web Renderer 2 subproject into build system ([15be93e](https://github.com/alem0n/Macast/commit/15be93eff4aa235b2f5a1a6f3d6df53ae6be0d9d))
* remove volume controls, add prev/next navigation and auto-play next ([7d0c549](https://github.com/alem0n/Macast/commit/7d0c549922e31d2cbb2ef76a37af49b364673293))
* replace Node.js server with Python aiohttp, eliminate Node.js runtime dependency ([4f12f1b](https://github.com/alem0n/Macast/commit/4f12f1b2969ea80a871a6a327a0a06f6b84061a1))
* replace swipe video switching with touch drag-to-seek on progress bar ([5b949d4](https://github.com/alem0n/Macast/commit/5b949d4656a68fc10cd451e8c909f74d0c16eff6))


### Bug Fixes

* add permissions.contents.write to allow GitHub Release creation ([7be3cc9](https://github.com/alem0n/Macast/commit/7be3cc986098f7bba75dcacc9a8fb25f6a7579f0))
* condition tap-to-toggle on controls visibility ([1371a45](https://github.com/alem0n/Macast/commit/1371a4544ddc82969c5bb89423e6dd6596783d07))
* correct Python syntax check command in CI workflow ([ff9ffdb](https://github.com/alem0n/Macast/commit/ff9ffdb028d3959a64032310921d6465468ab7f0))
* dynamically fetch latest mpv release via API instead of hardcoded URL ([6d0268f](https://github.com/alem0n/Macast/commit/6d0268f58d2dbe8e2bccb894bed936ec4a8e9ce7))
* fallback to GITHUB_TOKEN if MY_RELEASE_PLEASE_TOKEN not configured ([fa3b92f](https://github.com/alem0n/Macast/commit/fa3b92fd5ec47baaa35cf1c1207ac3b3d5bf0d69))
* indent Python code properly in YAML block scalar ([b19057f](https://github.com/alem0n/Macast/commit/b19057f8d04019c8954b21a1f8925dcc3407e621))
* initial project setup with build artifact exclusion and vendor integration ([3aa2682](https://github.com/alem0n/Macast/commit/3aa26825811b2eb959091967bfde55607fd44285))
* remove double-tap gesture delay, make single-tap play/pause instant ([e38ff1b](https://github.com/alem0n/Macast/commit/e38ff1b64d6aa4595242ba503d8da3d2fb35419d))
* replace netifaces with ifaddr, auto-extract Web Renderer 2 from exe ([3d6d571](https://github.com/alem0n/Macast/commit/3d6d571faf25a7d5fa597da9527a033d6ee3f855))
* transparent pause overlay, fix touch tap-to-resume double-toggle ([978d762](https://github.com/alem0n/Macast/commit/978d762eae7dbcf5355e54a91f686ebf05c7cfd5))
* use semver format (0.7 -&gt; 0.7.0) for release-please compatibility ([58432a2](https://github.com/alem0n/Macast/commit/58432a214edb38e1c835b6afe711e7e79e21bba5))
* yaml syntax in ci.yml — use inline string instead of block scalar ([f79de97](https://github.com/alem0n/Macast/commit/f79de97cb902a61a068443cadcedb1e40193a7ee))


### Documentation

* add build scripts and development guide to README ([9887500](https://github.com/alem0n/Macast/commit/988750027d71fee7d5d9f9c623d80733d623a3a2))
* restructure READMEs as extension project with original upstream content appended ([97b738e](https://github.com/alem0n/Macast/commit/97b738ef1d4861a72955803db1cc034a9b29e46a))

## [0.8.0](https://github.com/alem0n/Macast/compare/Macast-v0.7.0...Macast-v0.8.0) (2026-07-03)


### Features

* add CI/CD workflows (publish, ci, release-please) ([5ccd63c](https://github.com/alem0n/Macast/commit/5ccd63cb2478addfd36644382623318c3d03594a))
* build.ps1 improvements and Web Renderer 2 server updates ([91b957a](https://github.com/alem0n/Macast/commit/91b957a7d80a32754a46b01a738857286b46512f))
* fix keyboard shortcuts, add touch gestures and URL health checker ([c19c878](https://github.com/alem0n/Macast/commit/c19c8782c5adab74983e00b956999f61769c1cb5))
* integrate Web Renderer 2 subproject into build system ([15be93e](https://github.com/alem0n/Macast/commit/15be93eff4aa235b2f5a1a6f3d6df53ae6be0d9d))
* remove volume controls, add prev/next navigation and auto-play next ([7d0c549](https://github.com/alem0n/Macast/commit/7d0c549922e31d2cbb2ef76a37af49b364673293))
* replace Node.js server with Python aiohttp, eliminate Node.js runtime dependency ([4f12f1b](https://github.com/alem0n/Macast/commit/4f12f1b2969ea80a871a6a327a0a06f6b84061a1))
* replace swipe video switching with touch drag-to-seek on progress bar ([5b949d4](https://github.com/alem0n/Macast/commit/5b949d4656a68fc10cd451e8c909f74d0c16eff6))


### Bug Fixes

* condition tap-to-toggle on controls visibility ([1371a45](https://github.com/alem0n/Macast/commit/1371a4544ddc82969c5bb89423e6dd6596783d07))
* correct Python syntax check command in CI workflow ([ff9ffdb](https://github.com/alem0n/Macast/commit/ff9ffdb028d3959a64032310921d6465468ab7f0))
* fallback to GITHUB_TOKEN if MY_RELEASE_PLEASE_TOKEN not configured ([fa3b92f](https://github.com/alem0n/Macast/commit/fa3b92fd5ec47baaa35cf1c1207ac3b3d5bf0d69))
* indent Python code properly in YAML block scalar ([b19057f](https://github.com/alem0n/Macast/commit/b19057f8d04019c8954b21a1f8925dcc3407e621))
* initial project setup with build artifact exclusion and vendor integration ([3aa2682](https://github.com/alem0n/Macast/commit/3aa26825811b2eb959091967bfde55607fd44285))
* remove double-tap gesture delay, make single-tap play/pause instant ([e38ff1b](https://github.com/alem0n/Macast/commit/e38ff1b64d6aa4595242ba503d8da3d2fb35419d))
* replace netifaces with ifaddr, auto-extract Web Renderer 2 from exe ([3d6d571](https://github.com/alem0n/Macast/commit/3d6d571faf25a7d5fa597da9527a033d6ee3f855))
* transparent pause overlay, fix touch tap-to-resume double-toggle ([978d762](https://github.com/alem0n/Macast/commit/978d762eae7dbcf5355e54a91f686ebf05c7cfd5))
* use semver format (0.7 -&gt; 0.7.0) for release-please compatibility ([58432a2](https://github.com/alem0n/Macast/commit/58432a214edb38e1c835b6afe711e7e79e21bba5))
* yaml syntax in ci.yml — use inline string instead of block scalar ([f79de97](https://github.com/alem0n/Macast/commit/f79de97cb902a61a068443cadcedb1e40193a7ee))


### Documentation

* add build scripts and development guide to README ([9887500](https://github.com/alem0n/Macast/commit/988750027d71fee7d5d9f9c623d80733d623a3a2))
* restructure READMEs as extension project with original upstream content appended ([97b738e](https://github.com/alem0n/Macast/commit/97b738ef1d4861a72955803db1cc034a9b29e46a))
