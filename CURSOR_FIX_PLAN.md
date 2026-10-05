# CWrite Lite：交给 Cursor 的详细修改任务

日期：2026-10-04。依据本目录 `AUDIT.md`、18 张线上截图及当前本地源码。本文是实施说明，所列修复尚未实施。

## 保留现有童话农场、棕色木框、浅色纸张、紫色角色卡包与 Cagent 小熊的风格。提高可读性和布局密度，避免重新设计成大量浮动窗口。图片继续使用 fal.ai Nano Banana 2，文字继续使用 DeepSeek，真实 Drama 视频使用火山方舟 `doubao-seedance-2-5-260628`。



## 1. 实施顺序和主要文件

| 顺序  | 工作                     | 主要现有文件                                                                                                               |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | 确认版本、保留通过项、补关键回归测试     | `lib/section-gate.ts`、`app/api/section-gate/route.ts`、`app/api/[resource]/route.ts`                                  |
| 2   | 修复价值观误判、登录恢复、保存反馈      | `lib/growth.ts`、`app/api/ai/route.ts`、`app/page.tsx`                                                                 |
| 3   | 地图固定落点、角色透明素材          | `app/api/map-update/route.ts`、`lib/fal-images.ts`、`lib/fal-map.ts`、`lib/map-markers.ts`、`lib/types.ts`               |
| 4   | 统一响应式、字体、按钮、弹窗         | `app/globals.css`、`components/lite/common.tsx`、各页面组件                                                                 |
| 5   | Story/Drama 建议、画板与阅读排版 | `components/lite/story-canvas.tsx`、`canvas-examples.tsx`、`writing.tsx`、`drama-editor.tsx`、`drama.tsx`、`lib/drama.ts` |
| 6   | 接入真实多幕视频任务与成片          | `lib/ark-video-config.ts`、`lib/drama-video-plan.ts`、`components/lite/drama-animation-preview.tsx`，新增视频服务、任务接口与数据库模型  |
| 7   | 完整回归、本地构建、集中提交         | `package.json`、`prisma/schema.prisma`、迁移文件、部署说明                                                                      |

线上审计没有完成线上提交与本地源码的逐项版本比对；不得直接拿本地整个目录覆盖最新仓库。不要上传 `.env`、`node_modules`、`.next`、本地数据库、`.tool-cache`、临时 ZIP 导出包。保留项目实际依赖的 `public` 素材和锁文件。

## 2. 必须保留的产品规则

- 新 Story 的本篇角色 Deck 初始为空；右侧卡包展示该用户共享角色库。Story 与 Drama 共用角色资料，不能复制出重复角色。
- 角色生成一次得到一个角色；保留保存/使用流程，不恢复 `I like this one`。
- Story Canvas 不再新增角色；人物来自前一步。生成背景后，不再额外展示 Setting 卡片。
- 四角锚点支持真正拖线；候选连线可以直接点击加入。
- Story Canvas 灯泡仅该用户首次进入时自动显示，后续仍可手动打开。
- Story 画板不完整可以提醒后继续写；**正文结构检查不能用同一个跳过入口绕过**。
- Drama 画板保持一幕同时展示的创作方式。选人物后编辑 Says 或 Thinks，同一人物在同一幕当前只用一种；点击空白退出编辑。视频播放顺序另行推导，不改变原始画板。
- Story/Drama 最终作品在 Writing Board 以文字阅读。视频作为独立附件，不用漫画图片替代剧本文本。
- Cagent 胸口 EDUHK 标志不得拉伸；人物素材透明、无额外背景。保留小熊与容器边缘的自然接触，避免悬空或挡住进度。
- Farm 保留现有动画与原画，不加大片土块遮挡花草、工具和鸡，不重新叠出两个鸡头、两组秋千绳。
- 原来十二个价值观名称和 ID 对应关系不得改动。

## 3. Story 正文检查：加强回归，不能放松门槛

**本次线上测试已通过四种负面输入，不应描述为当前仍全部失效。**重点是防回归，并检查接口层是否同样受保护。

涉及：`lib/section-gate.ts`、`lib/story-plan.ts`、`app/api/section-gate/route.ts`、`app/api/[resource]/route.ts`、`components/lite/writing.tsx`。

### 实施方法

1. 检查必须读取数据库中该用户最新保存的正文、画板、选定角色与前文；不接受前端自行提交 `pass:true`。
2. 保留现有五项证据检查：能理解、人物真实参与、画板关联、当前结构匹配、情节有推进。每项必须引用当前正文中的真实短句，并核对角色/节点/连线 ID。
3. 保留重复段落、相同长对话、少量换词或加开头的重复检测。不要仅因出现 Fox、forest、bag 就通过。
4. Beginning 引入人物与起始情境；Rising Action 出现目标推进与困难；Climax 有关键挑战/选择；Falling Action 展示后果；Ending 解决既有事件或表现改变。不能把同一问候/对白分别贴进五部分通过。
5. 接受简单英语、现在时、轻微语法和拼写错误，只要情节能理解。不要要求每一段重复所有人物、每个物品或严格复述画板标签。
6. AI 出错、超时、返回非法 JSON 或证据不存在时，返回“未完成检查，请重试”，不能自动通过。保留草稿。
7. 修改画板、角色、已通过部分后，按实际上下文依赖使旧审批失效；检查中编辑正文则旧响应作废。核对现有 hash 是否完整覆盖依赖；调整校验规则时更新 `GATE_VERSION`。
8. 完成/发布的服务端继续验证五段审批。不能只禁用前端 Next 按钮。
9. 失败原因固定显示在该部分旁边，最多一条主要原因和一个问题；学生编辑后可以再次检查。不要只用瞬间 toast。

### 验收

- 无关足球/披萨故事，即使加 Fox 名字也不通过。
- Fox、forest、blue bag 等词语乱拼不通过。
- 将结尾总结写进 Beginning，不因字数足够就通过。
- 同一对白原样、大小写变化、加开头后复制进 Rising Action 不通过。
- 合理承接前文的新事件可通过；合理使用代词可通过。
- 简单但完整的五部分故事可逐步完成。
- 直接请求发布、改画板后复用旧签名、检查时并发编辑，都不能绕过校验。

## 4. 价值观成长：按实际行为判断

涉及：`lib/growth.ts`、`app/api/ai/route.ts` 的 `growth`、`app/page.tsx` 的发布逻辑。

现有兜底会把否定句里的关键词识别为正向行为；AI 的成长理由也曾优先引用“kindness”总结词，而非归还失物的行为。

### 实施方法

- 按句子与分句分析，判断**谁做了什么、是否已经发生、是否被否定、上下文结果**。不能仅凭角色 traits、标题、提示词、价值观名称、引用中的口号奖励。
- AI 输出至少包含 `treeId`、原文 `quote`、简短 `reason`；引用必须存在于该用户已完成正文。优先选具体行为，如归还包、承认损坏、帮助父母。
- 区分肯定行为、否定行为、愿望、未完成承诺、假设和引用。`did not tell the truth` 不等于诚实；`did not give up` 可表示坚持。
- 不要写一个“整段出现 not 就拒绝”的规则：`Fox did not laugh. He helped his friend.` 仍有善行。
- 离线兜底保守处理，只奖励明确已完成的行为；复杂或歧义情况记为待分析，允许稍后重试，不强行猜测。
- `growthProfile` 目前只核对引文存在，需补证据资格校验；不要仅让前端过滤。
- 每作品/每价值观只奖励一次；并发重试也不重复。用数据库事务、唯一约束或等价的原子去重保护。继续保留最多两项奖励及当前成长上限。
- 提供 `pending / succeeded / failed` 状态。作品保存成功后成长分析失败，应显示 `Your writing is saved. Growth check needs another try.`，并提供 Retry。移除空的 `catch`。

### 必测对照

| 输入                                              | 预期                    |
| ----------------------------------------------- | --------------------- |
| Fia did not tell the truth.                     | 不奖励 Integrity         |
| Fia told the truth about the broken pencil.     | 可奖励 Integrity         |
| Fia never followed the rules.                   | 不奖励 Law-abidingness   |
| Fia followed the rules and waited for her turn. | 可奖励 Law-abidingness   |
| Fia did not keep trying.                        | 不奖励 Perseverance      |
| Fia did not give up. She tried again.           | 可奖励 Perseverance      |
| Fia was not proud of my country.                | 不奖励 National Identity |
| Fia did not help my mother.                     | 不奖励 Filial Piety      |
| Fia helped her mother carry the bags.           | 可奖励 Filial Piety      |
| Honesty is important. / I want to help someday. | 不仅凭这句话奖励              |
| “I helped,” said Fia, but she was lying.        | 不奖励该虚假善行              |
| 同一作品连续保存/重试五次                                   | 不重复增长                 |

原 ID：1 Perseverance、2 Respect for Others、3 Responsibility、4 National Identity、5 Commitment、6 Integrity、7 Benevolence、8 Law-abidingness、9 Empathy、10 Diligence、11 Filial Piety、12 Unity。展示顺序可维持农场现有两排；不要误把显示序号当 ID。

## 5. Writing Map：由应用保证落点

涉及：`app/api/map-update/route.ts`、`lib/fal-map.ts`、`lib/map-markers.ts`、`lib/types.ts`、`app/api/[resource]/route.ts`、`app/page.tsx`，以及实际渲染地图的组件。

### 推荐方案

1. 保留底图；单独生成与该作品有关的小插画，处理透明边缘后作为地图图层。不要再把整个地图交给模型，仅靠提示词保证坐标。
2. 利用现有 `MapFlagItem.previewArt` 扩展保存插画引用、作品 ID、归一化锚点和版本。写入用户 `mapState` 时保留其他作品。
3. 图片与 pin 使用同一坐标变换。统一 `x/y` 为 0–100 百分比，指定锚点为插画底部中心或预定接触点。屏幕缩放后仍对应同一地图位置。
4. 如果底图用 `object-fit:cover`，按真实缩放比例与裁切偏移换算位置；不能直接乘外框宽高。必要时采用保持整图可见的渲染方式。
5. 标题做紧凑木牌；已有标题后不再重复加 Story 图钉图案。标题冲突时只调整标签并画短引线，**不能为了避让把插画和真实落点一起移走**。现有 `map-markers.ts` 的避让逻辑需要明确这一区别。
6. 无 pin 的新写作，由应用分配并保存一个空闲坐标，再生成插画，避免模型决定不可恢复的位置。
7. API 改为用 `storyId` 从登录用户的数据库作品读取标题、pin 和内容，不信任客户端传来的 `userId`、任意底图地址及完整提示词。
8. 地图更新失败不影响作品文本保存；显示可重试状态。基于作品版本去重，不要重试一次又付费生成整张地图。

验收：在左上、中间、右下分别发布作品；插画接触点和 pin 同位，1280/1024/768 下保持一致；第二篇不移动或擦掉第一篇；标题清晰且不遮挡插画；失败后文字作品仍可阅读。

已被旧模型写入底图的偏移插画不能只靠新图层消除。旧地图需要单独兼容：保留历史底图，或提供一次重新整理地图的操作；不得自动抹掉学生已有成果。

## 6. 角色和物品图：保留 Nano Banana 2，增加透明素材流程

涉及：`app/api/ai/route.ts` 的 `image`、`lib/fal-images.ts`、`components/lite/character-studio.tsx`、`prisma/schema.prisma`、`lib/types.ts`、Drama 演员渲染。

- 拆分 character / object / background 三类提示词。当前通用“forest fairytale illustration”不应强加给角色和物品。
- Character：一个完整角色、干净简单底色、无场景、无文字、四肢完整；背景单独生成。生成完成后实际去背景，不能以模型写了 transparent 就当作有透明通道。
- 建议新增 `spriteUrl` 保存透明演员素材，保留 `imageUrl` 供卡面兼容；如果统一使用透明图，卡面背景由 CSS 提供。新增数据库字段必须给旧数据默认值和迁移。
- 可选 fal `fal-ai/imageutils/rembg`，先核对官方参数与费用；共用 `FAL_KEY`。它是额外处理调用，需在 API 清单中列明。[fal 去背景接口](https://fal.ai/models/fal-ai/imageutils/rembg/api)
- 物品单独居中突出主体，例如 Blue bag 的包占画面大部分，不能主体淹没在森林里。
- 输出优先 WebP；有透明通道则保留 alpha，禁止转 JPEG。卡片/演员长边先考虑 512–768px；背景先考虑 1280px。以实际显示清晰度验证，不强制所有图一个尺寸。
- 建议体积目标：单角色/物品约 50–200KB，单背景约 200–500KB；是优化目标，不可为了达标破坏轮廓或胸口标志。以真实输出记录尺寸/字节数。
- 老角色按需生成透明素材并缓存；不要每次打开卡包重新付费。处理中、失败、重试均有状态。
- 连续双击生成/保存不应产生两个角色：后端对同次生成和保存请求去重，前端禁用处理中按钮。

验收：狐狸、兔子和一种人形卡各一个；放入两个不同背景无矩形底色、无断头残边；一个角色只保存一次；卡包展示仍清楚。

## 7. 页面布局、按钮、字体与农场

涉及：`app/globals.css`、`components/lite/common.tsx`、`character-studio.tsx`、`writing.tsx`、`drama-editor.tsx`、`farm-scene.tsx`、`farm-guide.tsx`、`page-guide.tsx`。

### 响应式与比例

- 移除 `body { min-width:1120px; }`。逐个修复固定列宽和最小宽度，不用 `overflow-x:hidden` 掩盖屏幕外的按钮。
- 网格子项设置 `min-width:0`；图片限制宽度并保持比例；导航可换行或在较窄尺寸改为简短步骤。
- Story 1280px 下维持写作约 2/3、右侧助手约 1/3；1024px 仍保证主按钮和助手完整；768px 下助手移到下方或可折叠，保留明显入口。
- Drama 保持 My Cast / 画板 / AI 的模块化布局；空间不足时折叠卡库，不挤压画板成细条。不要改变原始画布坐标。
- 主要点击区至少约 44×44px，主要按钮建议高 48px。可扩展透明点击区而不把路牌图案无限放大。
- 页面主文字建议 18–20px、输入文字约 20px、标题 24–30px、小信息约 14–16px。采用现有儿童友好圆润字体和较粗字重；保留足够对比度，不用近乎背景色的字。
- 详细介绍放灯泡；主页面每模块只留标题、必要状态和一个短提示。全局动效在 `prefers-reduced-motion` 下可减少。

### 农场

- 保留原图布局，树苗仍在对应土格里；不再每个位置增加大土框。
- 树苗、标签随农场实际坐标放置。十二个英文不换行，使用合理字号和轻巧木标签，标签不被前方树苗遮挡。
- 若768px整幅农场不能同时容纳清楚的长标签，保留画面上的短标签/交互，并提供点击后的清晰名称说明，不能把长单词缩成无法阅读的字。
- 静音、灯泡维持目前足够大的点击区。Start Writing 与 Visit friends' farms 同一路牌的比例协调，用轻微抖动/光泽加强 Start Writing，不再夸张放大。
- Footer 不挡鸡，不留底部白条；不要靠改变浏览器缩放才能正确显示。
- Settings / Writing Board 的前景图只适当放大覆盖原区域，避免改动底图后产生重复文字。
- 所有对话和弹窗使用统一层级，成长弹窗打开时 Hello there! 不得浮在遮罩上方。

### 角色生成页

- 收紧空白，将当前步骤资料、画稿和生成按钮放在同一视域；可使用容器内固定底部操作栏。
- 1280×720 下主操作完整可见，不能让生成按钮被截掉一半。
- 卡片详情页不重复 My Character Card 标题；底部保留一个 Use in my Story，Drama 来源则明确返回 Drama。

## 8. Story Canvas、案例与 AI 建议

涉及：`story-canvas.tsx`、`canvas-examples.tsx`、`lib/canvas-geometry.ts`、`app/api/ai/route.ts`。

- 卡片拆分短 `label` 与完整 `details`/绘图描述。添加物品时让学生写短名字和描述；旧长标签仅在展示时缩短并可查看完整内容，保留原数据。
- 连线建议分别保存 source、target、短关系词、自然语言解释。UI 展示“Fox → notices → Blue bag”，不要把整段提示词与动词机械拼接。
- 候选连线用足够清楚的虚线与浅色标签；已选为实线。文字不可用 SVG 非等比拉伸；保持候选可直接点击加入。
- 保留棕色、较大的添加物品按钮，不恢复 Add Character。
- View Examples 使用黄色按钮和灯泡，放在缩放控件左侧；两者组成画板右侧工具组。
- 两个案例维持明显区别：简单田园与较复杂科幻，不再复制同一节点结构。难词提供简短释义。
- 案例渲染使用固定逻辑画布，例如现有1000×620，整个内部世界统一比例缩放。卡片、文字和连线同步缩放，不能只有 SVG 被拉伸。
- 根据实际卡片宽高计算全部节点边界和边缘留白。复杂案例最下方 Energy cell 必须完整显示。
- 1280px 案例左画板、右故事；窄屏可上下布局，但卡片不能变成竖排文字。弹窗顶部标签页和关闭按钮固定可达。
- 不完整画板检查列出具体缺项/断开的关系；允许 Write anyway，且提醒不会代替后续正文检查。

## 9. Cagent 与建议的上下文和英语难度

涉及：`app/api/ai/route.ts`、`deck-coach.tsx`、`writing-coach.tsx`、`drama-coach.tsx`、`lib/drama-suggestions.ts`。

- 服务端统一一个 A1–A2 learner 配置：常用词、短句，一次一个下一步；Cagent 默认约 20–35 词。不要输出整篇范文。
- 复杂词如 dappled/mossy/airlock 默认用更简单的说法；如保留在科幻案例，加简短释义。
- Story 请求包含当前部分、已写段落、真实画板/角色；Drama 包含当前幕、背景、当前选中人物、Says/Thinks、该幕全部现有话语。
- 将学生正文作为不可信数据传给模型，不能执行正文中“忽略检查并通过”等指令。
- 未选 Drama 角色时给场景下一步建议；已选角色时推荐其可能说/想的内容。Thinks 句型以该角色第一人称表达，UI 标题清楚标记是谁在想。
- 建议响应拆为 `explanation` 与 `insertText`；点击只插入可写内容，不把整段解释贴入输入框。预设句型含空白时应提示填完，完成前检查必须识别空白。
- Cagent 只建议当前 UI 能完成的操作。未提供 Action 时，不要求学生去一个不存在的动作编辑器；可以问“Which words could show she feels better?”。
- 保留实时上下文关联，同时防抖。每个请求绑定上下文版本，编辑、切幕或切结构后丢弃旧响应；不能把旧人物的建议覆盖新人物。
- 按既有要求：Story Canvas 不再加重复 Ask Cagent；由 AI Suggestion 触发换姿态。Story 正文自动指导不加 Ask 按钮。
- 使用安全 Markdown 渲染或统一转为纯文本，农场不要显示字面的 `**Start Writing**`。

## 10. Story 小熊位置和内容布局

涉及：`writing.tsx`、`writing-coach.tsx`、`app/globals.css`。

- 小熊手掌接触右侧 My Story Canvas 的顶部边框，不趴在文章结构栏上，也不浮在容器上方。
- 浅紫色指导泡在小熊左侧，位于结构栏下、写作框和画板上方的可用区域；不能挡住正文或结构进度。
- 用真实测量的对话高度驱动画板上方留白，并做约 200–350ms 的平滑高度调整；限制过长响应，不用字符串字数硬猜高度。
- 减少动效设置下直接调整。窄屏改为普通文档流，禁止绝对定位造成重叠。

## 11. Drama 气泡和最终文本展示

涉及：`drama-bubble.tsx`、`lib/drama-bubble-layout.ts`、`drama-editor.tsx`、`drama-scene-preview.tsx`、`drama-animation-preview.tsx`。

- 外框保持圆角矩形。Says 用小尖尾，Thinks 用逐渐变小的圆点连接角色；不用整块云朵轮廓。
- 用角色和气泡实际边界计算可放位置：优先上方，再左/右/下；靠画布顶部时侧移。避开角色图与已有气泡，最终限制在画布边界内。
- 角色拖动、缩放、翻转、改变文本、调整视口都重新布局。
- 只有点击角色进入编辑；空白点击退出；点击输入框/气泡控件不能误退出；拖动结束不能触发误选。
- 编辑文本框可以内部滚动，文本不会丢失；阅读及动画播放必须能看到完整原文，不用省略号作为唯一展示。
- 动画播放建议在画面旁或下方设置完整字幕区，以当前角色、Says/Thinks 标记和完整原文显示；按长度分页/分段字幕，字幕先后顺序不漏词。不要要求观看者滚气泡才能读完。
- Generate Background / New background 不换行；给足按钮宽度，窄屏移到输入框下方，而非强行缩字。
- 弹窗关闭按钮固定在可见顶部，支持 Escape；打开关闭后焦点恢复触发按钮。

## 12. Writing Board 与正式作品排版

涉及：`app/page.tsx` 阅读区域、`drama.tsx`、`lib/drama.ts`。

- Story 按五部分换行阅读，保留正文原文；标题和作者区紧凑。
- Drama 按幕排版：幕标题 → 简短场景描述 → 角色名和 Says/Thinks → 原文。保留换行，不能压成一个大段落。
- 默认幕名直接显示 Scene 1；自定义名显示 Scene 1 — The classroom，避免 Scene 1: Scene 1。
- 场景学生描述与图片生成控制词分离，可新增 `settingDescription`（若在 JSON 内则不用单独数据库列）。不要把“no characters / no people or animals”等控制词写进剧本文本。
- 历史内容兼容：优先读取结构化 sections/drama 数据，无法恢复时显示已有文本；不能通过粗暴替换删除学生真正写的句子。
- 删除重复帮助按钮，编辑按钮达到可点击尺寸。视频作为单独附件显示状态，不替代文本。

## 13. 登录恢复、保存、错误和小文案

### 登录恢复

`app/page.tsx` 初始化 `/api/auth` 有用户时，目前仍设置 `login`。修改为有效会话进入农场或安全恢复页；加载完成前显示短暂加载状态，不闪现登录表单。401/过期才回登录，并保留服务器草稿。不要无条件将用户自动带入上一次写作，农场仍需提供 Continue。

### 保存与错误

- 导航、生成建议、正文检查、发布之前确认最新编辑已保存；处理现有 800ms 防抖的竞态。
- 检查响应对应草稿版本；保存失败时不显示 Saved。
- 作品保存、地图更新、价值观分析、视频生成分别维护状态。一个后续服务失败不能把已保存作品当作失败或覆盖为空。
- 错误提供明确 Retry；失败检查原因持续存在，修复后重新检查。
- 通用弹窗层级统一；避免农场欢迎语高于遮罩。

### 文字统一

| 当前                                   | 修改                                         |
| ------------------------------------ | ------------------------------------------ |
| Add a object                         | Add object                                 |
| Appeared in 1 pieces of writing      | Appeared in 1 piece of writing；多篇使用 pieces |
| Setting（设置入口）                        | Settings                                   |
| Visit Others' Farm / Farms           | Visit friends' farms                       |
| Login to start your creative journey | Log in to start writing                    |
| Species，含 Boy/Girl 选项                | Character type                             |
| AI generate (Fal.ai)                 | Make a picture                             |
| Cagent / C Agent 混用                  | 全站统一 Cagent                                |
| 检查已通过但 Continue anyway               | 通过时 Continue；提醒后跳过才用 Continue anyway       |

Drama 创建角色后提示返回当前 Drama；地图选 pin 后 Cagent 提示“Choose a place”，不要继续提示先拖 pin。

## 14. 真实 Drama 视频：完整实施方案

### 14.1 接口选择已确定

用户已开通模型权限、有余额，并已设置 Vercel 视频变量。**不用让用户重新提供文字模型示例或将文字模型 Key 换成另外一种 Key。**需要确认现有 Ark Key 在所选模型/区域下有效；调用方式由代码适配。

- 模型：`doubao-seedance-2-5-260628`，读 `ARK_VIDEO_MODEL`，未填则用该默认值。
- 认证：服务端 `Authorization: Bearer <ARK_API_KEY>`。
- 创建：`POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks`。
- 查询：`GET https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{taskId}`。
- 之前的 `doubao-seed-2-1-pro-260628` 与 `/responses` 是文字接口，不能拿来生成视频；这不代表现有视频权限有问题。
- 建议成片先用 720p、16:9；按实际模式核对 ratio，不能混用首帧与多模态参考的参数。Seedance 2.5 单段支持4–30秒，长剧本需拆分。[模型官方说明](https://docs.volcengine.com/docs/ark/seedance-2-5)、[视频任务参数](https://docs.volcengine.com/docs/82379/1520757?lang=zh)

### 14.2 新增代码边界

建议新增：

- `lib/ark-video.ts`：只在服务器运行，创建/查询任务、超时、供应商错误转换。不得把密钥传到客户端。
- `lib/drama-render.ts`：将现有动画计划转换为参考画面、镜头段、字幕及合并清单。
- `app/api/drama-video/route.ts`：创建或恢复任务。
- `app/api/drama-video/[id]/route.ts`：查询该用户任务状态/附件；跨用户404。
- `components/lite/drama-video.tsx`：Generate video、进度、失败重试、成片播放/下载。
- Prisma `VideoJob`、`VideoClip`（或等价模型）与迁移文件。不要仅保存在组件状态、内存、JSON下载文件或 `/tmp`。

建议数据：job 的 userId、storyId、revisionHash、model、plan、status、errorCode、errorMessage、outputUrl、createdAt/updatedAt；clip 的 jobId、sceneId、sequence、duration、providerTaskId、status、sourceUrl、storedUrl、error。字幕存原文与时间轴，便于审查。

### 14.3 生成顺序和内容保真

1. 读取数据库已保存的 Drama，验证归属和基本完整性；复用现有 `dramaProblems` 和连贯性提醒规则。
2. 快照当前剧本版本。计算 hash 覆盖背景图、演员图片/位置/大小/翻转、全部原文、幕顺序和模型配置。
3. 调用/复用 `dramaVideoPlan`：每幕先背景，再人物，再安排回应顺序。保留现有对行 ID 的校验，每句恰好一次，不跨幕，不新增角色或改写对白。
4. 按幕生成合成参考图，准确体现背景和演员的站位。视频模型负责轻微表演，不负责重新设计角色和改英文。
5. 每段控制在模型允许时长；长幕按完整话语边界拆段，保持人物/背景参考一致。不能为了30秒上限删后半部台词。
6. 背景先短暂建立；说话时突出当前人物，其他人物轻微回应；思考用思考标记和字幕。Thinks 默认不当成说给其他角色听的对白。
7. **英文字幕由程序使用学生原文生成并合成**，禁止指望视频模型画出准确文字。若有语音，必须核对是否对应原文；不能保证语音逐字一致时，明确以字幕为准，不宣称完整精准配音。
8. 将所有片段按幕合并成一个可下载 MP4；文字字幕完整、无漏幕。还可保留分幕预览，但一组片段链接不等于完整成片。
9. 成片长期转存后再标记 ready，写回该作品的视频附件；Writing Board 仍保留原文字。

### 14.4 异步与费用防重

建议内部状态：`planning → generating → rendering → storing → ready`，异常进入 `failed`。供应商 queued/running/succeeded/failed 映射到内部状态；画面不要显示虚假的精确百分比，可显示“Scene 1 of 2”。

- 创建接口只建立任务并快速返回202，不在一次 Vercel 请求中等待几分钟直到视频生成完成。
- 对同一 storyId + revisionHash 的有效任务做数据库去重；并发创建要靠唯一约束/锁，不能只靠按钮 disabled。
- 每次 Ark 创建成功立即保存 providerTaskId。客户端轮询只查状态，不能每次再创建付费任务。
- 查询/重试接口校验登录用户；job ID 不等于授权。
- 提交请求超时且不知道供应商是否收到时，标记“提交结果待确认”，不能自动无限重复提交；需要供应商可用的查询/关联机制或明确人工/用户重试边界。
- 已成功片段复用，只重试失败片段；再次付费生成前明确提示。不要全剧本自动无限重做。
- 关闭网页、刷新、重新登录后能恢复；后台仍能完成查询、转存和合并，不依赖浏览器一直打开。
- Vercel 前端/API负责提交和查询；重处理通过可靠后台队列/任务服务推进。不能靠一个未等待的 Promise 在 serverless 请求结束后继续处理。

### 14.5 成片存储和合并：部署需要补齐的基础设施

**ARK_API_KEY 与 ARK_VIDEO_MODEL 解决视频模型调用，不等于已具备长期存储和多段合并服务。**建议使用火山 TOS 保存参考图、原始片段、字幕和最终 MP4，另用可运行 FFmpeg 的后台 worker 合并与叠字幕。可以配置方舟到 TOS 的产物自动转存；程序需保存可长期访问的对象引用，而非只存临时 URL。

官方说明视频结果链接有效24小时、下载有次数限制，所以不能直接把它当永久作品附件。[Seedance 保存时间说明](https://docs.volcengine.com/docs/ark/seedance-2-5)、[任务结果与 TOS 转存说明](https://docs.volcengine.com/docs/ark/list-video-generation-tasks-api?lang=zh)

合并 worker 要实现：按序下载已转存片段、统一帧率/尺寸、合并、叠英文字幕、上传成片、更新job。所有过程可重试并去重。影片完成后关闭网页仍能在 Writing Board 找回。

如果选择其他对象存储或托管渲染服务，Cursor需明确替代服务、权限和配置，不能保留未实现的 `mergeClips()` 占位。没有可用存储/worker时，界面说明还需配置，不能将网页 CSS 动画冒充 MP4。

## 15. 环境变量：已有与建议新增分开

### 现有项目使用或预留的变量

| 名称                         | 处理                                    |
| -------------------------- | ------------------------------------- |
| `DATABASE_URL`             | 现有 PostgreSQL；视频job新增表需要迁移            |
| `DEEPSEEK_API_KEY`         | 文字服务，继续使用                             |
| `FAL_KEY`                  | Nano Banana 2；若采用fal去背景，也共用此Key       |
| `APP_BASE_URL`             | 正式公网地址，用于可访问素材链接                      |
| `ARK_API_KEY`              | 用户已配置；新视频适配器需实际读取                     |
| `ARK_VIDEO_MODEL`          | 用户已配置；值为 `doubao-seedance-2-5-260628` |
| `CWRITE_LOCAL_MOCK_IMAGES` | 生产为false或不设置；禁止线上假生成                  |

`DEEPSEEK_KEY`、`NEXT_PUBLIC_APP_URL` 是旧备用名，继续兼容即可，不要求重复填。`SEED_TONY_PASSWORD` 仅用于种子脚本，不是AI运行所需变量；已有生产用户不用重新初始化密码。

### 建议新增：只有选择对应实现后才需要配置

以下名称**是本方案建议，现有代码尚未读取**。Cursor应统一最终名称并更新 `.env.example` 和部署文档；不能直接声称现在填入就生效。

| 建议名称                                        | 用途                     |
| ------------------------------------------- | ---------------------- |
| `TOS_ACCESS_KEY_ID`、`TOS_SECRET_ACCESS_KEY` | 自有TOS对象存储服务身份；最小范围读写权限 |
| `TOS_BUCKET`、`TOS_REGION`、`TOS_ENDPOINT`    | 存储桶与访问位置               |
| `VIDEO_WORKER_URL`、`VIDEO_WORKER_SECRET`    | 合并/字幕后台服务地址与服务端认证      |

若后台选择主动拉取数据库job，不需要再新增回调配置；若使用回调，增加签名验证，并记录实际变量名。禁止公开可伪造“任务完成”的接口。TOS配置属于存储，不要把这些访问密钥误当成Ark视频模型Key。

部署后应列出完整真实外部调用清单：DeepSeek、Nano Banana 2、Nano Banana 2/edit、选用的去背景服务、Ark Seedance创建/查询、存储与渲染服务。只列最终代码确实调用的服务。

## 16. 验收矩阵与部署要求

### 自动验证

- Story：重复检测、真实引文/ID、结构审批依赖、直接发布绕过、并发编辑。
- Growth：第4节全部正负对照、一次奖励、并发重试；完整Story与Drama各一例。
- Map：三个落点、缩放/裁切换算、标记与插画锚点、旧作品保留、无pin分配、归属验证。
- Drama：每句一次的顺序、无跨幕/漏句、Says/Thinks、气泡边界、视频长幕拆段、完整字幕顺序。
- Video：双击并发只建立一个job、刷新恢复、供应商超时不盲重提、失败片段重试、成功转存/合并、跨用户查询拒绝。
- 用供应商mock覆盖多数失败情况；默认自动测试不调用付费AI。真实请求单独执行并记录任务ID、结果和费用次数，不输出密钥。
- TypeScript检查和 `npm run build` 成功；数据库迁移先在测试数据库验证，不运行会覆盖生产账号的seed或reset。

### 页面检查

至少1280×720、1024×768、768px宽。若修到窄窗，还测641px，不能以整页横向滚动作为正常体验。

逐页检查：登录、My Farm、灯泡指引、Settings、Writing Map、Continue取消弹窗、角色选择、角色卡包、创建角色、卡片详情、Story Canvas、案例弹窗、五部分写作、完成页、Writing Board、作品阅读、Drama多幕编辑、最终检查、动画预览、真实视频状态/播放、朋友农场、评论及老师入口（需准备第二个学生及老师测试账号）。

每页确认：标题/输入/主操作可见，按钮可点击，字体可读，无遮挡/溢出/截字；小熊与对话位置正常；灯泡打开/关闭；加载、失败、空数据状态；键盘关闭弹窗；内容保存后刷新可恢复。

### 必须做的真实端到端

1. 新Story Deck为空 → 从卡包选/新建角色 → 实际生成背景和物品 → 拖线 → 无关/重复/错误结构被拒绝 → 正常五段通过 → 保存 → Board可读 → 插画落点正确 → 价值观引用具体行为。
2. 新Drama → 共用角色 → 两幕不同背景 → Says/Thinks及建议插入正确 → 完整性检查 → 正式剧本文本保存 → 地图与成长正确。
3. 两幕Drama真实Seedance任务 → 状态查询 → 所有片段与字幕合并 → MP4可播放/下载 → 刷新/重登后结果可找回；随后验证存储对象长期可读，不能只测临时链接当天能打开。
4. Continue叉号：保留回顾与二次确认，Cancel保留草稿；删除用专门新建的测试草稿验证，不能删真实学生作品。
5. 第二学生发布评论，作者看到并可标为已读；老师入口用实际老师账号验证。没有账号则明确列为未测。

### 迁移和集中部署

- 新增数据库列/表采用增量迁移；先提供备份/回滚说明。不要 `db push --accept-data-loss` 或重置生产库。
- 确认生产当前迁移方式；需要运行 `npm run db:migrate` 时安排在应用依赖新字段之前。构建成功不代表生产表已迁移。
- 本地测试完成后集中提交、一次推送；不要为每个文件、截图或文案单独触发部署。
- Vercel上线后再做短的真实验收，确认新版本实际生效；环境变量修改只作用于后续部署，不修改既有部署。[Vercel环境变量说明](https://vercel.com/docs/environment-variables)
- 最终报告逐项写：已修复/已测/未测/需配置，不写笼统“全部正常”。真实MP4、长期存储、字幕合并三项任何一项缺失，都不能宣布视频已完整接通。

## 17. 完成标准

本方案18项审计问题都有对应修改或明确的兼容处理；原先通过的核心流程无回归；数据库与素材不丢失；主要屏幕尺寸完整可用；真实AI请求结果有证据；视频不重复付费、不只停留在网页预览；用户拿到最终环境变量表和一次集中推送的部署记录。

原始证据与实际未测范围见同目录 `AUDIT.md`。不要把方案里的目标和自动测试预期当作已经完成的线上验证。
