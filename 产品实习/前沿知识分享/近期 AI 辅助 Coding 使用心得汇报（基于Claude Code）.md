# 近期 AI 辅助 Coding 使用心得汇报（基于Claude Code）

# **一、用 AI 解决了哪些问题**



## **1\. 日常 Bug 修复**



命令行对话模式是日常使用最频繁的场景。近期典型案例：



- **\#6108 **解决xlog在ios低版本闪退问题,网上查找无果，询问AI，导出IOS日志，AI给出提示是cmake脚本未指定版本

- **\#5698 **华为等机型权限弹窗失效：部分机型在系统设置手动改权限后 App 无法再弹框，AI 提供"监听 \`onResume\` \+ 重新 check \+ 延迟重试"的兜底方案，两个 App 同步修复。

- 华为手机无法人脸识别问题，后来经过AI发现是华为yuv视频流转换和安卓不同，经过兼容性修改正常

- 华为手机摄像头拍照二次进入是屏幕发黑的问题，经过AI排查是插件在华为手机上的兼容性问题，通过拷贝第三方库源码修改的方式解决

一些棘手问题例如：

zs\_loan\_app 在华为/鸿蒙等机型上出现概率性闪退，复现困难。AI 协助：

- 提取崩溃堆栈，快速识别崩溃位置在 `another_telephony` 的 `RESULT` 拦截逻辑，而非 App 自身代码问题。

- 分析权限初始化并发竞态，给出 `LocationManager` 与应用列表请求串行化方案。



对于有明确报错堆栈或复现步骤的 Bug，AI 的定位速度远超人工搜索，尤其是跨文件调用链追踪。



## **2\. 沉淀自己的 Skill**



在 `.claude/skills/` 目录下沉淀了六个可复用的自定义 Skill：



|Skill|用途|
|---|---|
|`flutter_env`|执行 Flutter 命令前检查并注入 `JAVA_HOME / FLUTTER_HOME / ANDROID_HOME`|
|`flutter-analyze`|一键在当前子包跑 `flutter analyze`，输出结构化问题列表|
|`flutter-build`|封装构建命令，自动识别当前所在 App 目录|
|`gen-code`|代码生成辅助（模型、页面骨架、GetX Controller）|
|`getx-reviewer`|针对 GetX 用法做专项 Review（Controller 生命周期、`fenix` 模式、`permanent` 滥用等）|
|`security-reviewer`|检查 HTTP 加密链路、本地存储 Key 是否泄漏、权限声明是否最小化|



这些 Skill 把团队工程规范（CLAUDE\.md 约定）固化成可复用的 Prompt 片段，新功能开发后直接 `/getx-reviewer` 走一遍，节省 Code Review 中的重复劳动。



## **3\. AI 辅助 Monorepo 架构改造**



chat\_im 和 zs\_loan\_app 原本是两个独立项目、两个独立仓库，但两者共享了大量代码（HTTP 加密客户端、本地存储、通用 Widget 等）和若干体量较小的插件，维护成本高、容易产生分叉。AI 全程参与了合并改造：



\- **workspace 依赖拓扑设计**：协助规划根 \`pubspec\.yaml\` 成员声明、子包 \`resolution: workspace\` 写法及 \`path:\` 依赖的正确姿势。

\- **公共代码抽取**：把两个 App 重复的 \`Boot\`、\`HttpClientEncrypt\`、\`NavigationUtils\`、\`ToastUtils\` 等下沉到 \`packages/app\_common\`，AI 协助区分"真正通用"与"App 专属"逻辑。

\- **\`Boot\` 双层 mixin 架构**：基类在 \`app\_common\` 提供 \`UserBinding / ConfigBinding / LocationBinding\`，子类通过 mixin 扩展专属字段，分层清晰，两个 App 改造后均无破坏性变更。



改造后公共代码改一处两端同时生效，插件也不再需要各自维护一份。



## **4\. AI 生成 flutter\_device\_identifier 插件**



`packages/flutter_device_identifier` 是完全由 AI 辅助生成的 Flutter 原生插件，用于上报设备指纹与违规行为判断：

\- **L0–L3 分层指纹**：强标识（IMEI/IDFA）→ 微差异指纹 → 机型骨架 → 环境证据，字段定义与 \`device\.csv\` 对齐。

\- **风险信号采集**：root/越狱、Hook 框架、模拟器、调试态检测，无需任何运行时权限，可在启动前置链路调用。

\- **传感器零偏采集**：陀螺仪 \+ 加速度计零偏，用于硬件级设备区分。

\- **应用列表获取**：Android 通过 \`LAUNCHER Intent\` 枚举可见应用，兼容 Android 7\+，不依赖 \`QUERY\_ALL\_PACKAGES\` 敏感权限，绕过国产 ROM 拦截。



从接口设计、Android Kotlin 实现、iOS Swift 实现到 Dart 平台接口均由 AI 辅助完成，开发周期约 2 天，人工估计需 1 周以上。



## **5\. AI 辅助裁剪腾讯 mars xlog 并编写 Flutter 插件（调试日志本地保存）**

app在使用过程中碰到问题，如果没有日志往往很难排查出问题，因此急需日志插件能够记录所有程序运行过程中日志方便开发人员分析问题，mars的xlog采用mmap内存映射技术，相较于传统的日志记录库有将近10倍的提升，但它虽然好用却和腾讯的mars代码耦合严重，单独编译也会引用很多无用代码导致二进制包过大。因此要将xlog单独抽离出来，就需要分析并改动大量c代码，不了解项目或者对c代码不熟悉的人很难做到。但借助 AI完成了：

- 从 mars 仓库中抽离 xlog 核心模块，裁剪掉与业务无关的组件，减少二进制包体积\(Android 裁剪前2MB裁剪后 501KB,ios裁剪前8\.5MB 裁剪后 2MB\)。

- 编写适配 Flutter 的 xlog 插件，封装 Dart 接口。

- 相关修改已提交至开源仓库：[https://github\.com/lancexin/flutter\_xlog](https://github.com/lancexin/flutter_xlog)



## **6\. DevOps 脚本辅助**

见下一节。

更多细节参考 [移动端开发手册](https://vyejighahd.feishu.cn/wiki/MGw8wgP5qieua7kRVOEcqdlUny8)

# **二、AI 辅助编写脚本，帮助 DevOps**

`scripts/` 目录下的脚本均为AI自动化生成，经过了多轮迭代:

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZWE0ZTI4MWMyYzVlMDhlZjYzZWVhOWZhYWNjODliMjZfYmMwZjE3ZmY3ZDRkNzAwMWU2YmY5MDFlZmU4YWU5MTRfSUQ6NzY1MDMzMzY3ODg5NjA3MzY5Nl8xNzgyNjk3OTg5OjE3ODI3ODQzODlfVjM)

覆盖以下规范与流程：

## **Git 提交与发布规范**

\- **提交格式规范**：通过 hook 校验 commit message 格式，强制带 \`\[app\_name\]\` 前缀和禅道 Bug 号，统一团队提交风格（目前feat并没有落地bug系统，暂时性绕过）。

\- **版本发布 \+ tag 规范**：\`build\_version\.sh\` 以 \`pubspec\.yaml\` 的 \`version:\` 为唯一来源，\`sed\` 同步写入 Android \`versionCode/versionName\` 和 iOS \`MARKETING\_VERSION\`，打包后自动打 git tag，杜绝版本漂移。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=NjJmN2I0NDExZjE5NzI4NWM1OGIyZjU3YzQyYTYxMjJfMTBkZjBlZTJjMjljYzhiNzZjZTQyMGZjNTY5YjJlZGFfSUQ6NzY1MDMzMzY3ODgyMDU5Mjg0Ml8xNzgyNjk3OTg5OjE3ODI3ODQzODlfVjM)

## **禅道集成（\`hook\_zentao\.sh\`）**

push 到远程时自动触发，解析 commit message 中的 `#xxxx` Bug 号，通过禅道 21\.5 传统 PHP 路由写入 Bug 备注，把代码提交信息同步回需求系统，方便后期代码\-需求对照。支持 `--dry-run` 本地验证。

举例：http://192\.168\.1\.10:8080/index\.php?m=bug\&f=view\&bugID=6109

## **飞书提醒（\`feishu\_send\.sh\` \+ \`hook\_feishu\.sh\`）**

构建完成、版本发布、代码审查完成后自动推送飞书消息，团队成员无需手动通知。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=YjllNTQzNDRkMTM2NTBiMDZhNGNmYWJkYWVmYWM2NjFfMmFlMDllNDg1NzQxMTNlZDJlMDFhYTU3YmM1NjhjNTlfSUQ6NzY1MDMzMzY3ODgxMjIzNjk5Nl8xNzgyNjk3OTg5OjE3ODI3ODQzODlfVjM)

## **FTP 上传（\`upload\_ftp\.sh\`）**

构建产物与更新日志自动上传到FTP服务器。

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=OTY4ZmI5NjQ2MzM1MjA2ZjIwZjg1OWQyNTQ3NDFiMThfMzg5MDQyYzYxOTk3OWE4YzMyODljMmM1NTA4ODBlOTRfSUQ6NzY1MDMzMzY3ODQ5MzMzODU5NV8xNzgyNjk3OTg5OjE3ODI3ODQzODlfVjM)

## **自动化编译（Jenkins 等，提供支持暂未验证）**

构建脚本（`build_android.sh` / `build_ios.sh`）设计为无交互、参数化，可直接接入 Jenkins Pipeline，支持 CI 环境下的自动编译与产物归档。

通过jenkins编译任务我们可以编译不同作用的包：

A\. ngihtly包，永远是最新可用代码包，每日拉取dev分支最新代码编译

B\. fixbug专项修复包，bug修复后通过git提交触发编译，编译成功通知禅道，同时触发jenkins自动编译并打包上传到git服务器，通过飞书通知测试进行专项bug测试，测试成功后反馈给开发，开发合并到主分支。

C\. Tag包，开发人员阶段性打Tag对近期所有git提交做归拢，升级app版本，打tag，jenkins收到tag钩子，编译集成测试包，通过飞书通知测试做集成测试，测试提出bug，开发修改bug，迭代发布hotfix包，最终形成稳定版本。稳定后将dev代码提交到master分支。



## **Commit 触发 Claude 自动代码审查（\`hook\_review\.sh\` \+ \`post\-commit\`）**

\- 每次 \`git commit\` 后，\`post\-commit\` hook 用 \`nohup\` 异步启动审查，***不阻断 commit***。

- 调用本地 `claude` CLI 对当次 diff 生成中文 Markdown 审查报告，落地到 `.claude/reviews/<sha>.md`。

- 内置跳过逻辑（merge commit、改动过小/过大），可配置 `REVIEW_NOTIFY=1` 在 macOS 弹通知。

- 可配置审查完成后触发飞书提醒



举例子：

![Image](https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=Mzc4NTUxMjlkNWY3NjZjMTM5NmUwYzQ0ZTk2ODk4MmNfOTYxMmRjYTJiNWNjNmQ3OGY3N2Y2MWZlMGY2N2QyMjlfSUQ6NzY1MDMzMzY4MDU3NzI1MjUzOF8xNzgyNjk3OTg5OjE3ODI3ODQzODlfVjM)

[代码审查报告样例](https://vyejighahd.feishu.cn/wiki/EljlwntPNiKYgKkgHDFcv1D7nRg)

## **Push 触发 Claude Code审查 \+ 禅道同步 \+ 飞书提醒（\`hook\_review\_push\.sh\`）**

- git push 时触发，对新 push 的 commit 范围批量执行代码审查，审查结果自动保存并通过飞书推送给相关人员。

- 同步调用 `hook_zentao.sh`，把代码提交信息写入禅道 Bug 备注，形成"提交 → 审查 → 通知 → BUG系统同步"的完整闭环。

***和git commit不同 ，git push是阻断式的，保证代码AI验证通过才提交到远程仓库***



# **三、挑战与问题**



## **Vibe Coding \(开发\)研究方向的挑战**

目标：**通过 AI 自动拉取禅道 Bug → 分析 Bug → 解决 Bug （自动化校验）\-\>自动编写测试用例→ 提交 Git 分支 → jenkins触发自动编译\-\>跑自动化测试\-\>输出报告等待验收，全程无需人工参与。**

这是当前较值得投入的方向，已有基础设施支撑（禅道 API 集成、自动审查 hook、飞书通知），核心卡点是以下三个挑战：



### **挑战一：Bug 描述质量**  

禅道里的 Bug 描述必须足够准确，抽象描述 AI 无法理解；目前 AI 也无法直接识别图片或视频附件。这个问题可通过对测试人员进行"AI 友好型 Bug 描述"培训来缓解——明确的复现步骤、版本号、机型、预期/实际行为缺一不可。但很多问题仍然不是文字描述能描述清楚的。



### **挑战二：缺乏真机校验能力**  （短期障碍）

AI 修复 Bug 后，目前没有工具能让 AI 直接操作真机验证修复结果，仍需人工介入。这是 Vibe Coding 当前最大的阻碍，短期内依赖人工兜底，长期看或许可以探索结合 UI 自动化测试（如 patrol）或设备云来解决。但仍然不能完全代替人工



### **挑战三：缺乏测试用例单元测试能力不足** （自身不足）

以前没有：写测试用例占用大量开发人员时间，相当于重新开发一次项目，只做集成测试效率会更高

现在没有：写测试用例对AI来说是很简单的事情，同时测试用例也是让AI对自己写的代码自查的手段之一。



目前项目现状：缺失测试用例，之前的代码里未发现测试用例，目前代码架构工程化，抽象化不足（平台相关代码和平台无关代码）不适合做单元测试。getx天生不适合做单元测试



## **目前AI辅助开发Flutter发现的一些问题**



### **a\.  对开源插件问题的质疑能力不足**  

遇到第三方插件引发的问题时，AI 的修改倾向是绕开插件、在项目内部代码层面解决，对"是否是插件本身的 bug"缺乏主动质疑。改进方向是在 Prompt 中明确要求 AI 先排查插件侧原因，再考虑业务层绕行方案。



### **b\. 输出的概率性与不稳定性**  

相同的提示词在不同对话中可能给出差异较大的方案，导致修复质量不稳定。可能原因之一是提示词定义不够精确——越具体的约束（明确技术栈、代码范围、期望格式）越能收窄方差，模型的思考也有一定的随机性。

但一般情况下开发人员首次使用时询问AI都不会有太多约束，因为经验性不足。因此在让AI解决问题时，可以设置两个角色：A问题解决者，B解决方案评审者，两者相互输入输出经过多轮，再人工判断，这样做或许能够更加全面的理解问题，解决问题。



### **c\. 处理冷门问题或复杂重构时仍可能有疏漏**  

Claude Code目前能够将复杂问题拆分成多个小问题然后逐条解决，测试下来基本可以做80\-90%的事情，但仍然有10\-20%的任务需要人工介入：



AI 有时能把握到问题的核心（如 iOS 权限弹框后锁屏导致后续权限请求报错，能定位到时底层插件问题），但生成的修改代码却不涉及集成，生成的代码不可用。AI在代码层面上理解自己代码可用，但可能受限于真机调试能力不足，这类场景目前仍需人工介入完成最后一步。



Claude Code 在修改问题时考虑的已经非常全面，但是偶尔仍然会有少量梳理，例如：在对 chat\_im 和 zs\_loan\_app 做公共功能提取时，AI 将权限校验与弹框提醒相关代码抽取到 `app_common`，但复用了 chat\_im 中的提示模块并只做了少量修改。后续（很长时间以后）测试中发现 zs\_loan\_app 的权限验证提示文案出现错乱，原因是两个 App 的文案处理方式细微不同，AI 未能充分区分两端的差异，导致返工。这类疏漏在跨 App 重构时更容易出现。或许可以考虑将策划方案，相关文案等一并放入仓库，让AI有能力检索，写相关skill，让AI修改完后严格检查需求与代码是否有背离。

结论：例如Claude Code等AI辅助编程插件已经有非常高效的代码自查机制，例如修改代码后知道自己去跑一下flutter analyze,保证自己的修改的代码没错误，或者内部有代码审查机制的subangent对输出进行审查等。但目前AI仍受限于与获取数据方式狭窄

AI帮你做了80%，但仍需要你根据经验去把控最后的20%。

# **四、后续规划**



## **1\. 探索 AI 结合自动化测试方向**

继续探索将 AI 引入自动化测试流程，通过 AI 辅助生成测试用例、分析测试结果，保证代码提交质量，降低人工回归成本。



## **2\. 提升代码可测试性（架构改造）**

当前两个 App 各模块耦合严重，难以独立编写测试用例。若要真正落地自动化测试，需要对 App 做深层次架构改造（如依赖注入、业务逻辑与 UI 解耦等）。这一步改造成本和改造后的验证成本均较大，需要评估后择机推进，但它是后续所有测试工作的前提。



## **3\. 覆盖单元与集成测试用例（AI 生成为主）**

在完成架构改造的基础上，以 AI 生成为主批量覆盖测试用例。非 UI 逻辑（HTTP 层、工具类、业务状态机等）可直接在命令行跑，不依赖真机，成本低、反馈快，是优先覆盖的目标。***但需要先实现前提2***



## **4\. 真机自动化测试（patrol/agent\-device \+ AI）**

探索通过 [patrol](https://patrol.leancode.co/) / agent\-device 等AI自动化测试框架,结合 AI 实现真机自动化测试的可能性——由 AI 生成 patrol /agent\-device 测试脚本，覆盖核心用户路径（登录、权限申请、表单提交等），逐步替代部分人工回归，也为 Vibe Coding 全自动 Bug 修复闭环提供真机校验能力。



## **5\. 持续优化自动化脚本，Jenkins 发布流程提权给测试与产品**

以 AI 生成为主，继续完善 `scripts/` 下的自动化脚本，目标是能执行脚本自动拉取禅道上的bug，自动修改并提交到git同时输出修改报告。同时将 App 的编译、打 tag、测试用例自动验证，版本发布流程完整接入 Jenkins，实现一键触发、无需开发介入。测试与产品人员可自主发起构建和发布，开发只需维护脚本与流水线配置，从版本发布的日常事务中解放出来。



## **6\. A2UI协议学习（Flutter GenUI）**

A2UI solves the following problem: **how can AI agents safely send rich UIs across trust boundaries?**

https://a2ui\.org/\#specification\-versions

这可能会演变成终端与人交互的便捷窗口协议





# **附录\. 更加深入的了解**Agent运行原理以及实用技巧备忘录



## 理解Agent基本概念：

[LLM 基本概念](https://blog.lienjack.com/blog/AI/1.%E6%A6%82%E5%BF%B5%E4%BB%8B%E7%BB%8D)

[Claude Code源码解析](https://blog.lienjack.com/blog/AI/3.ClaudeCode%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90)



## 高效且节省运用Agent：

prompt不是越详细越好，agent内部机制已经帮了你很多，你不说它知道。你加了只会浪费token。影响输出速度。

prompt应该是实践结果，在使用过程中积累，出了问题有需求你才加，没问题可以暂缓。减少token。需要有意识积累经验。

别人总结的skill和prompt是否就是好的？可以借鉴，但需要自己实践对比和修改，不同人，模型不同，项目不同都可能都有差异。



分析任务和执行任务应该区分开？：

分析任务（分析代码；探索方案）：阅读性要好，输出文本质量要高

执行任务（写代码）：只需要怎么做和工作进度，分析文本应限制输出。输出文本应简洁，可以节省大量token



## LLM Token累加计算 token消耗案例：

|轮次|本轮提交的完整输入内容|本轮输出内容|本轮输入token|本轮输出token|本轮总消耗|累计总token消耗|
|---|---|---|---|---|---|---|
|1|你好|你好，请问能为您做什么？|2|10|12|12|
|2|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？|找到更好的工作|25|5|30|42<br>|
|3|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？ A:找到更好的工作 Q:如何能找到更好的工作?|您需要学习很多的技能|39|7|46|88<br>|

注：多轮对话中，模型每轮都需要把完整历史对话作为输入，因此累计总消耗会叠加每轮的输入输出token，实际不同分词工具会有±5%左右的偏差。

**结论：会话轮次越多，token成本是倍数增长的，响应速度是越来慢的**



## LLM和Agent的区别：

Agent实际上就是对会话的管理以及提供更多获取数据的能力。Agent会将一个任务拆分成多个子任务，子任务有自己的会话上下文，子任务的输出会作为主任务的输入累加到主上下文中，这有效避免了主上下文的过载。Agent有上下文裁剪的能力，当会话窗口达到临界值时，Agent会自主裁剪和压缩会话，让任务能够继续进行。

但是仍然避免不了：**token成本是倍数增长的 **定律。

如何让Agent花更少的钱，做更多的事可能是Agent开发者和使用者需要研究的一个重要课题。



## LLM运行核心原理（简短描述）

LLM本质是统计模式识别器，基于Transformer架构训练，核心逻辑分三步：

1. 将输入文本分词转换为模型可识别的Token编码；

2. 根据已有的Token序列，用***概率***预测下一个最可能出现的Token；

3. 重复预测过程直到生成完整文本，再转换为自然语言输出。多轮对话中，每一轮都需要将所有历史对话作为输入，因此Token消耗会随轮次累积增长。

|推理步数|模型当前输入（完整上下文\+已生成Token）|模型输出（预测下一个Token）|本轮新增Token消耗|
|---|---|---|---|
|1|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？|找|1|
|2|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？找|到|1|
|3|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？找到|更|1|
|4|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？找到更|好|1|
|5|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？找到更|工|1|
|6|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？找到更好工|作|1|
|7|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？找到更好工作|\<end\>|1|

输出token的概率性，是指大语言模型在预测下一个token时，会给词汇表中所有候选token分配概率值，概率越高代表模型认为该 token 越符合上下文逻辑，最终选择概率最高的token输出。

|当前已生成内容（完整输入\+已输出token）|候选token|预测概率|最终选择输出|
|---|---|---|---|
|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？|找<br>赚<br>更<br>多<br>发|45%<br>25%<br>15%<br>10%<br>5%|找‌|
|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？找|到<br>你<br>他<br>我<br>人|40%<br>20%<br>20%<br>10%<br>10%|到‌|
|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？找 到|更<br>好<br>新<br>稳<br>薪|60%<br>15%<br>10%<br>8%<br>7%|更‌|
|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？找 到 更|好<br>多<br>强<br>优<br>大|55%<br>20%<br>10%<br>10%<br>5%|好‌|
|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？找 到 更 好|工<br>职<br>项<br>机<br>项|50%<br>25%<br>10%<br>10%<br>5%|工‌|
|Q:你好 A:你好，请问能为您做什么？ Q:如何才能赚更多的钱？找 到 更 好 工|作<br>资<br>位<br>活<br>程|65%<br>15%<br>10%<br>7%<br>3%|作‌|



