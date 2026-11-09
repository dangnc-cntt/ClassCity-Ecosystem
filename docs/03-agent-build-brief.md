# CLASSCITY 3D – BRIEF THI CÔNG DÀNH CHO AI AGENT

> **Đọc kỹ toàn bộ trước khi viết dòng code đầu tiên.**
> Tài liệu này là *nguồn chỉ đạo duy nhất* cho việc xây game **ClassCity**. Nó gộp và làm rõ 2 tài liệu gốc:
> - Đặc tả tính năng: `C:\Users\dangnc1\Downloads\t_i_li_u_c_t_k_thu_t_classcity_saas.md` (làm gì)
> - Kiến trúc tham khảo: `C:\Users\dangnc1\.gemini\antigravity\brain\3d9ae68c-ed60-40fa-b8e3-31ad73e944da\kien_truc_he_thong_classcity_ecosystem.md` (tổ chức thế nào, dài hạn)
>
> Nếu có mâu thuẫn: **file này thắng** (đã chốt phạm vi giai đoạn 1).

---

## 0. MỤC TIÊU & PHẠM VI

**Mục tiêu ngay bây giờ:** xây được **game ClassCity chạy hoàn chỉnh, độc lập, 100% phía client** (dữ liệu lưu `localStorage`).

**Nhưng phải xây theo cách** để sau này:
1. Thêm game thứ 2, 3… vào cùng hệ sinh thái mà **không phải viết lại** ClassCity.
2. Gắn backend thật (Java Spring Boot) bằng cách **viết adapter mới**, không sửa game.
3. **Bán được**: có gói Free/Pro, đa khách hàng (tenant), đổi thương hiệu, đa ngôn ngữ, xuất/nhập dữ liệu.

### ĐÃ CHỐT (không hỏi lại, không đổi)
| Quyết định | Giá trị |
|---|---|
| Hình thức repo | **1 app Vite duy nhất**, nhưng thư mục chia **ranh giới như monorepo** (xem §3). Tách package khi có game thứ 2. |
| Backend | **Không có.** Chỉ `LocalStorageAdapter` (+ `InMemoryAdapter` cho test). |
| Người điều khiển | **Chỉ giáo viên** (màn chiếu/máy giáo viên). Chưa có đăng nhập học sinh. |
| Đa cấp & học sinh đăng nhập (sau này) | **Chỉ chuẩn bị điểm nối, chưa xây**: `Role`, `Permission`, `SessionUser`, `PermissionService`, `actorUserId`, `StudentCore.userId?`. Xem `02-system-architecture.md` mục 8A.6. |
| Ngôn ngữ UI | Tiếng Việt mặc định, nhưng **mọi chuỗi qua `t()`** (sẵn sàng thêm `en`). |
| Mô hình 3D | **Chưa có file `.glb`**. Dùng Procedural Fallback là chính; tầng nạp `.glb` vẫn phải viết và hoạt động (404 → fallback). |

### NGOÀI PHẠM VI (đừng làm bây giờ)
Backend thật, đăng nhập thật, thanh toán, realtime đa thiết bị, game thứ hai, iframe bên thứ 3, PWA/Service Worker. Chỉ để lại **điểm nối (seam)** như mô tả ở §4.

---

## 1. HIỆN TRẠNG DỰ ÁN (đã làm sẵn)

Thư mục: `C:\Users\dangnc1\.gemini\antigravity\scratch\classcity-3d`

- Đã scaffold Vite + React + TS, **đã `npm install`** các gói: `three@0.187`, `@react-three/fiber@9.8`, `@react-three/drei@10.7`, `three-stdlib`, `gsap`, `canvas-confetti`, `zustand@5`, `lucide-react`, `tailwindcss@4` + `@tailwindcss/vite`, `@types/three`, `@types/canvas-confetti`.
- **Chưa viết bất kỳ code ứng dụng nào.** `src/` vẫn là template mặc định của Vite (xóa `App.css`, `assets/*` mẫu).
- **Chưa cấu hình Tailwind** (phải thêm plugin vào `vite.config.ts` và `@import "tailwindcss";` vào `src/index.css`).

### Ràng buộc môi trường (QUAN TRỌNG)
- **Windows + PowerShell, chính sách chạy script chặn `npm.ps1`.** Luôn gọi **`npm.cmd`** (ví dụ `npm.cmd run build`, `npm.cmd run dev`). **Không** đổi Execution Policy, không dùng cách vòng nào khác.
- `tsconfig.app.json` đang bật: `verbatimModuleSyntax` (dùng `import type` cho kiểu), `erasableSyntaxOnly` (**cấm `enum`, `namespace`, parameter properties** trong class → dùng union string / const object), `noUnusedLocals/Parameters`. Giữ nguyên các cờ này.
- React 19 + R3F 9 + drei 10: dùng API của các phiên bản này (đừng copy code của R3F 8).
- Lint: `oxlint` (script `npm.cmd run lint`). Phải sạch lỗi.

---

## 2. NGUYÊN TẮC KIẾN TRÚC (BẮT BUỘC TUÂN THỦ)

| # | Nguyên tắc | Cách kiểm tra |
|---|---|---|
| R1 | **Game không biết dữ liệu nằm đâu.** Chỉ gọi interface Repository. | `grep localStorage` ngoài thư mục `platform/adapters` phải ra **0 kết quả**. |
| R2 | **Điểm là sổ cái bất biến.** Chỉ `award(delta)`; không có hàm "set points". `totalPoints` & `level` là **dẫn xuất**. | Không có code gán trực tiếp điểm. |
| R3 | **Domain thuần TypeScript** (không import React/three/zustand/DOM) → test được bằng Vitest/Node. | `src/games/classcity/domain/**` không có import `react`/`three`. |
| R4 | **Render loop không đi qua React state.** Vị trí xe, camera, bước chân avatar: `useRef` + `useFrame`. Store chỉ giữ trạng thái rời rạc. | Không có `setState`/`set()` gọi trong `useFrame` mỗi frame. |
| R5 | **Mọi thứ có `dispose`.** Unmount game phải kill GSAP, gỡ listener bàn phím, đóng `AudioContext`, dispose geometry/material/texture. | Có hàm `unmount()` & test mount→unmount không rò listener. |
| R6 | **Hợp đồng có version.** Mọi dữ liệu lưu/xuất/sự kiện có `schemaVersion`. Chỉ **thêm** field, không xóa/đổi nghĩa. | Có `schemaVersion` trong storage, backup JSON, event envelope. |
| R7 | **Không rải `if (tier==='pro')`.** Dùng `entitlements.has('feature.key')`. | `grep "subscriptionTier"` chỉ xuất hiện trong `platform/entitlements`. |
| R8 | **Mọi chuỗi hiển thị qua `t('key')`.** Không hard-code tiếng Việt trong JSX. | `grep` ký tự có dấu trong `.tsx` ngoài file `locales/` → 0. |
| R9 | **Mọi bản ghi nghiệp vụ có `tenantId`** (= id tổ chức; giai đoạn này luôn là `'local'`). | Kiểu TS bắt buộc field này. |
| R10 | **Màu/thương hiệu qua design token** (CSS variables), không hard-code màu thương hiệu rải rác. | Có `theme.ts` + biến CSS `--brand-*`. |

---

## 3. CẤU TRÚC THƯ MỤC (ranh giới "monorepo trong 1 app")

```text
src/
├── main.tsx
├── App.tsx                         # chỉ render <Shell />
│
├── shell/                          # "Game Hub" tối giản (sẽ thành app hub sau này)
│   ├── Shell.tsx                   # dựng context, chọn game theo registry, render <GameHost/>
│   ├── GameHost.tsx                # mount/unmount game module, ErrorBoundary, fallback 2D
│   ├── gameRegistry.ts             # danh sách GameManifest (hiện chỉ classcity)
│   └── EcosystemDevPanel.tsx       # (dev) giả lập "game khác cộng điểm" để test đồng bộ
│
├── platform/                       # TẦNG DÙNG CHUNG – game được import, platform KHÔNG import game
│   ├── types/
│   │   ├── models.ts               # TeacherProfile, ClassroomCore, StudentCore, PointTransaction, AssetMeta, GameId...
│   │   ├── events.ts               # EcoEvent<T,P> + danh mục sự kiện
│   │   └── manifest.ts             # GameManifest, GameModule, GameHandle, GameContext
│   ├── ports/                      # CHỈ interface
│   │   ├── repositories.ts         # Classroom/Student/Ledger/GameState/AssetCatalog repositories
│   │   ├── auth.ts                 # AuthPort (session giả lập)
│   │   └── telemetry.ts            # TelemetryPort (no-op mặc định)
│   ├── adapters/
│   │   ├── localStorage/           # DUY NHẤT nơi được dùng window.localStorage
│   │   │   ├── storage.ts          # get/set có namespace + schemaVersion + migration + try/catch quota
│   │   │   ├── repositories.ts
│   │   │   └── seed.ts             # mock data 36 học sinh
│   │   └── memory/                 # InMemoryAdapter dùng cho test
│   ├── createRepositories.ts       # factory: createRepositories(adapter)
│   ├── eventBus.ts                 # EcosystemEventBus (EventTarget + BroadcastChannel)
│   ├── entitlements.ts             # EntitlementService (bảng gói → feature)
│   ├── permissions.ts              # PermissionService (vai trò + phạm vi → quyền); adapter cục bộ cho phép tất cả
│   ├── i18n/
│   │   ├── index.ts                # t(), setLocale(), useT()
│   │   └── locales/vi.ts, en.ts    # en có thể để trống/đủ khóa chính
│   ├── assets/
│   │   ├── assetService.ts         # nạp glb, dedupe, refCount, LRU, priority queue, fallback
│   │   └── sharedCatalog.ts        # metadata mô hình dùng chung (avatar...)
│   ├── audio/soundEffects.ts       # Web Audio thuần code
│   ├── theme/theme.ts              # design tokens, applyTheme(tenantBrand)
│   └── backup.ts                   # export/import JSON có schemaVersion + validate
│
├── three-kit/                      # tiện ích 3D dùng lại được cho game khác
│   ├── BlobShadow.tsx
│   ├── AvatarProcedural.tsx        # (shared avatar – dùng được ở game khác)
│   ├── Disposer.ts                 # dispose đệ quy Object3D
│   └── PerfGovernor.tsx            # PerformanceMonitor → hạ chất lượng theo bậc
│
└── games/
    └── classcity/                  # TOÀN BỘ ClassCity nằm trong đây
        ├── index.ts                # export const manifest + module { mount }
        ├── ClassCityModule.tsx     # root React của game
        ├── config/
        │   ├── assetsRegistry.ts   # URL glb (shared vs game-specific), màu pastel, ngành hàng, avatar list
        │   └── cityLayout.ts       # sinh Lot[] + waypoint graph + camera focus
        ├── domain/                 # THUẦN TS – không React/three
        │   ├── levels.ts           # levelFromPoints, progressToNext, needsPrefetch
        │   ├── perks.ts            # Thẻ đặc quyền & luật hộp quà
        │   ├── vehicleFsm.ts       # máy trạng thái xe + AutoPilot planner
        │   ├── pathing.ts          # nội suy trên waypoint graph, easing
        │   ├── selectors.ts        # leaderboard, nearest lot...
        │   └── __tests__/*.test.ts
        ├── state/
        │   ├── types.ts            # kiểu ghép Student = Core + CityState
        │   ├── useClassStore.ts    # Zustand (slices)
        │   └── useCases.ts         # awardPoints, callStudent, changeAvatar...
        ├── components/
        │   ├── canvas/ CityScene, RoadNetwork, StudentLot, ShopModel, ShopProcedural,
        │   │           ShopToppers, Avatar3D, PatrolVehicle, GiftBoxes, ClassWonder,
        │   │           Weather, CameraController
        │   └── ui/     TopToolbar, StudentSidebar, CalloutModal, LeaderboardModal,
        │               SettingsModal, EcosystemModal, ImportExportModal
        └── locales/    # chuỗi riêng game, đăng ký vào i18n khi mount
```

### Quy tắc phụ thuộc (ghi vào script `scripts/check-boundaries.mjs`, chạy bằng `npm.cmd run check:boundaries`, và gọi trong `npm.cmd run verify`)
- `games/**` **được** import: `platform/types`, `platform/ports`, `platform/i18n`, `platform/assets`, `platform/audio`, `platform/theme`, `three-kit`.
- `games/**` **KHÔNG** được import: `platform/adapters/**`, `shell/**`, game khác.
- `platform/**` **KHÔNG** được import `games/**`, `shell/**`, `three-kit/**`.
- `domain/**` **KHÔNG** import `react`, `three`, `@react-three/*`, `zustand`, `gsap`.
- `localStorage` / `window.localStorage` chỉ trong `platform/adapters/localStorage/**`.
- Script phải quét import bằng regex, in danh sách vi phạm, `process.exit(1)` nếu có.

---

## 4. CÁC "ĐIỂM NỐI" CHO HỆ SINH THÁI & THƯƠNG MẠI (làm hết ngay, dù chỉ có 1 game)

### 4.1 Game Manifest & Module (platform/types/manifest.ts)
```ts
export type GameId = string;               // 'classcity' | 'classfarm' | ...

export interface GameManifest {
  id: GameId;
  name: string;                            // khóa i18n, vd 'game.classcity.name'
  version: string;                         // semver
  minSdkVersion: string;                   // '1.0.0'
  stateSchemaVersion: number;              // phiên bản state riêng của game
  requires: { permissions: string[]; entitlements: string[]; webgl: boolean };
  assets: { sharedIds: string[]; gamePrefix: string };
  entry: () => Promise<GameModule>;        // dynamic import
}
export interface GameModule { mount(el: HTMLElement, ctx: GameContext): GameHandle }
export interface GameHandle {
  unmount(): Promise<void>;
  onContextChange?(next: Partial<GameContext>): void;
}
export interface GameContext {
  user: SessionUser;
  classroomId: string;
  repos: RepositoryBundle;                 // đã inject adapter
  bus: EcosystemEventBus;
  assets: AssetService;
  entitlements: EntitlementService;
  permissions: PermissionService;          // can('ledger:write'); UI ẩn/vô hiệu nút theo quyền
  telemetry: TelemetryPort;
  audio: { muted: boolean };
  navigate: { toHub(): void };
}
```
- `shell/gameRegistry.ts` chứa `[classcityManifest]`. `Shell` đọc registry, kiểm `entitlements` + WebGL, rồi `GameHost` gọi `entry()` → `mount()`.
- `ClassCityModule` nhận **mọi thứ qua `GameContext`**, không tự import adapter.
- App chạy standalone = Shell tự động mở game duy nhất (không hiện hub); nhưng nút **"Về sảnh"** vẫn tồn tại trong Toolbar (phát `HUB:NAVIGATE`, Shell hiện màn hình chọn game có 1 thẻ + vài thẻ "Sắp ra mắt" mờ).

### 4.2 Repository ports (platform/ports/repositories.ts)
Định nghĩa **interface** (tất cả `async`):
- `ClassroomRepository`: `list()`, `get(id)`, `save(c)`, `archive(id)`.
- `StudentRepository`: `listByClassroom(id)`, `importBatch(classId, rows)`, `setEquippedAvatar(studentId, assetId)`, `update(studentId, patch)`.
- `LedgerRepository`: `award({studentId, classroomId, gameId, delta, reason, idempotencyKey, actorUserId}) → {tx, totalPoints}`, `history(studentId, limit)`, `totals(classroomId) → Record<studentId, number>`.
- `GameStateRepository`: `getClassroomState(classId, gameId)`, `patchClassroomState(classId, gameId, patch)`, `getStudentStates(classId, gameId)`, `patchStudentState(studentId, gameId, patch)` — mỗi state có `{ schemaVersion, rev, data }`; patch kiểm `rev` (optimistic), lệch `rev` → ném `ConflictError`.
- `AssetCatalogRepository`: `list(filter)`, `get(id)`.

Hàm `createRepositories(adapter)` trả `RepositoryBundle`. `award()` **idempotent**: cùng `idempotencyKey` gọi lại → trả giao dịch cũ, **không cộng thêm**.

### 4.3 Event bus (platform/eventBus.ts)
- Envelope: `{ type, schemaVersion:1, eventId, occurredAt, source:{gameId, instanceId}, tenantId, classroomId, payload }`.
- Kênh: `EventTarget` nội bộ + `BroadcastChannel('ecosystem')` (nhiều tab). Bỏ qua event có `source.instanceId` là của chính mình; chống xử lý trùng bằng `eventId` (LRU 200).
- Sự kiện tối thiểu: `LEDGER:POINTS_AWARDED`, `PROFILE:AVATAR_CHANGED`, `ROSTER:STUDENT_UPDATED`, `CLASSROOM:CHANGED`, `GAME:STUDENT_CALLED`, `HUB:NAVIGATE`, `AUDIO:MUTE_CHANGED`.
- `dispose()` đóng channel & gỡ mọi listener.

### 4.4 Entitlements (platform/entitlements.ts)
- Bảng gói → feature, ví dụ:
  - `free`: `classcity.single_class` (tối đa 1 lớp), tối đa 40 học sinh, ngành hàng/avatar cơ bản.
  - `pro`: `classcity.multi_class`, `classcity.export_backup`, `classcity.premium_avatars`, `classcity.leaderboard_export`.
- API: `has(feature)`, `limit(key)`, `tier`. Khi bị khóa: UI hiện biểu tượng khóa + modal **"Nâng cấp Pro"** (chỉ là placeholder, không thanh toán). Có công tắc dev (trong `EcosystemDevPanel`) để chuyển `free ⇄ pro` kiểm thử.

### 4.4b Permissions (platform/permissions.ts)
- `Permission` là chuỗi (xem kiểu ở mục 5). **Bảng ánh xạ vai trò → quyền nằm ở một file duy nhất**; không viết `if (role === 'teacher')` rải rác.
- `PermissionService`: `can(permission, scope?)`, `role`. Adapter localStorage cho giáo viên cục bộ **cho phép tất cả**. Mọi nút/hành động nhạy cảm (cộng/trừ điểm, đổi cài đặt, nhập/xuất, đổi lớp) phải kiểm `can(...)`; không đủ quyền thì ẩn hoặc vô hiệu và giải thích bằng `t()`.
- Mục đích: chuẩn bị cho trợ giảng, nhiều giáo viên và học sinh đăng nhập về sau. **Chưa** xây đăng nhập, tổ chức đa cấp, đăng nhập học sinh (xem `02-system-architecture.md` mục 8A).

### 4.5 Thương hiệu & i18n
- `theme.ts` định nghĩa token (`--brand-primary`, `--brand-accent`, `--surface`, bán kính, font) và `applyTheme(brand)`; `TenantBrand = { name, logoUrl?, primary, accent }`. Tên sản phẩm hiển thị lấy từ brand (mặc định "ClassCity").
- `i18n`: `t('toolbar.autoDrive')`, hỗ trợ nội suy `{name}`; `vi` đầy đủ; `en` ít nhất các khóa chính. Lưu locale trong settings.

### 4.6 Telemetry (no-op)
- `TelemetryPort.track(name, props)` và `captureError(err, ctx)`. Mặc định ghi `console.debug` khi `import.meta.env.DEV`. Gọi tại: mở lớp, auto-drive, gọi tên, cộng điểm, lên cấp, thiếu asset, fallback dùng, FPS thấp. **Không** gửi tên học sinh (chỉ id ẩn).

### 4.7 Dữ liệu lưu trữ (namespace + version)
Khóa `localStorage` (qua `storage.ts`):
- `eco:v1:teachers`, `eco:v1:classrooms`, `eco:v1:students`, `eco:v1:ledger`, `eco:v1:assets_catalog`
- `eco:v1:game:classcity:classroom_state`, `eco:v1:game:classcity:student_state`
- `eco:v1:settings` (locale, muted, theme/brand, dev tier)
- Mỗi blob: `{ schemaVersion, updatedAt, data }`. Có bảng `migrations` (rỗng giờ, nhưng cơ chế chạy được). Bọc `try/catch` khi `setItem` (quota) → báo toast, không sập app.

---

## 5. MÔ HÌNH DỮ LIỆU (TypeScript – đặt tại `platform/types/models.ts` & `games/classcity/state/types.ts`)

```ts
// platform/types/models.ts
export type Tier = 'free' | 'pro';
// tenantId == organizationId (tổ chức: cá nhân / trung tâm / trường). Xem docs/02 mục 8A.
export type Role = 'platform_admin' | 'org_owner' | 'org_admin' | 'teacher' | 'assistant' | 'student' | 'guardian';
export type Permission = 'roster:read' | 'roster:write' | 'ledger:write' | 'class:manage' | 'game:configure' | 'export:data' | 'org:manage' | 'billing:manage';
export interface SessionUser { userId: string; orgId: string; role: Role; displayName: string; studentId?: string }
export interface TeacherProfile { id: string; tenantId: string; name: string; email: string; tier: Tier }
export interface ClassroomCore { id: string; tenantId: string; teacherId: string; name: string; createdAt: string; archivedAt?: string }
export interface StudentCore {
  id: string; tenantId: string; classroomId: string;
  studentCode: number;              // 1..40
  name: string;
  totalPoints: number;              // cache của SUM(ledger.delta)
  walletCoins: number;              // chưa dùng nhưng có sẵn
  equippedAvatarId: string;         // dùng chung mọi game
  unlockedAssetIds: string[];
  userId?: string;                  // tài khoản đăng nhập của học sinh (luôn rỗng ở G0; dùng về sau)
}
export interface PointTransaction {
  id: string; tenantId: string; studentId: string; classroomId: string;
  gameId: GameId; delta: number; reason: string;
  idempotencyKey: string; createdAt: string;
  actorUserId: string;              // ai thực hiện (nhiều giáo viên/trợ giảng về sau); G0 = 'local-teacher'
}
export interface AssetMeta {
  id: string; category: 'avatar'|'vehicle'|'building'|'prop'|'pet';
  name: string; glbUrl: string; contentHash?: string; version: number;
  compatibleGames: GameId[] | '*'; scale: number; yOffset: number;
}

// games/classcity/state/types.ts
export type WeatherMode = 'sunny' | 'rainy' | 'rainbow';
export type ShopBranch = 'bakery'|'cafe'|'bookstore'|'petshop'|'gamecenter';
export type VehicleKind = 'car'|'ambulance'|'ufo';
export interface ClassroomCityState { pointsPerLevel: number; wonderProgress: number; weatherMode: WeatherMode; vehicleKind: VehicleKind; calledHistory: Record<string, number> }
export interface StudentCityState   { lotNumber: number; shopBranch: ShopBranch; shopColor: string; perks: PerkCard[] }
export interface PerkCard { id: string; kind: 'double_points'|'ask_help'|'lucky_point'; acquiredAt: string; usedAt?: string }
export type Student = StudentCore & StudentCityState & { level: number /* DẪN XUẤT */ };
```

### Luật điểm & cấp độ (domain/levels.ts – bắt buộc có unit test)
- `level = clamp(Math.floor(totalPoints / pointsPerLevel) + 1, 1, 20)`; `totalPoints` không âm (sàn 0).
- `progressToNext(points, ppl)` → `{ current, needed, ratio }` (level 20 → ratio = 1).
- `needsPrefetch(points, ppl)` ⇔ level < 20 **và** điểm còn thiếu để lên cấp kế **≤ 2**.
- `pointsPerLevel` mặc định **5**, cho phép 1–50; đổi → level tính lại ngay, **không sửa ledger**.
- `wonderProgress` = tổng `totalPoints` cả lớp (dẫn xuất, hiển thị theo mốc 0–100% của một "mục tiêu lớp" có thể cấu hình, mặc định = `36 × ppl × 5`).

---

## 6. CÁC TÍNH NĂNG CỐT LÕI – THÔNG SỐ CỤ THỂ

### 6.1 Quy hoạch thành phố (`config/cityLayout.ts` – hàm thuần sinh dữ liệu)
Layout là **dữ liệu**, không hard-code trong JSX. Hàm `generateCityLayout(lotCount = 36..40)` trả:
```ts
interface Lot { id: number /*1..N*/; position: [x,y,z]; rotationY: number;
  roadWaypointId: string; parkingPoint: [x,z]; parkingHeading: number;
  cameraFocus: { position:[x,y,z]; lookAt:[x,y,z] }; sidewalkPatrol: { a:[x,z]; b:[x,z] } }
interface WaypointGraph { nodes: Record<string,[x,z]>; ringOrder: string[]; }
```
Gợi ý số liệu (chỉnh được, nhưng giữ tỉ lệ): ground ≈ 130×100; đường vòng chữ nhật tâm tại `x∈[-30,30]`, `z∈[-22,22]`, rộng 5; đường ngang giữa `z=0` có **bùng binh bán kính ~7 ở tâm** chứa **Kỳ Quan** (xe chạy vòng quanh được). Ô đất 6×6, bước 8. Phân bố 40 ô: ngoài vòng (trên 8, dưới 8, trái 4, phải 4) + trong vòng (trên 8, dưới 8). Nếu lớp 36 người thì bỏ bớt 4 ô cuối (ô trống hiển thị bãi cỏ + cây).
- Mỗi lô **mặt tiền quay ra làn đường gần nhất**; `parkingPoint` nằm trên làn đó, ngay trước cửa; `cameraFocus` đặt **phía đường nhìn vào mặt tiền, độ cao ~6–8, cách ~12**, và phải **không bị nhà cấp 20 (cao tối đa ~14) của dãy đối diện che** → viết **unit test hình học** kiểm tra tia từ camera tới tâm cửa không cắt hộp bao của lô khác.
- Có hàm `nearestLot(x,z)` và `lotsByWaypoint`.

### 6.2 Cửa hàng (`ShopModel` → chọn GLB hay Procedural)
- `<ShopModel level branch color>`: thử `assetService.get('shop_level_N')`; thành công → `<GltfShop>`; lỗi/404/đang tải → `<ShopProcedural>`. Component cha **không phân biệt**.
- `ShopProcedural` theo đúng quy tắc 5 nhóm cấp (1–4 sạp mái sọc; 5–9 1 tầng + biển + cửa kính + 1 cây; 10–14 2 tầng + ban công + biển xoay + 2 cây + đèn; 15–19 3 tầng + mái vòm; 20 tháp 4 tầng + sao vàng xoay + vòng sáng). Chiều cao tăng dần mượt qua 20 cấp (tối đa ~14).
- **Topper ngành hàng** gắn tại điểm neo "Anchor_Topper" (procedural tự tạo một `group` neo trên nóc): bakery=bánh kem, cafe=cốc bốc khói, bookstore=sách mở, petshop=tai mèo/dấu chân, gamecenter=tay cầm game. Dựng bằng hình học đơn giản, **dùng chung geometry/material**.
- Khi level đổi: GSAP cho nhà **nảy lên cao rồi swap model** (scale/position anim trên group, `kill()` tween cũ trước).
- Dùng chung `BoxGeometry/CylinderGeometry/Material` qua cache module (`useMemo` toàn cục / `Map`). Màu cửa hàng chỉnh bằng `material.color`, **clone material theo màu** (cache theo hex).

### 6.3 Avatar
- 5 avatar tối thiểu: `knight, mage, astronaut, dino, cat` (procedural từ hình khối dễ thương; mỗi con có đặc điểm nhận biết: giáp/mũ, nón phù thủy, mũ kính phi hành gia, gai lưng + đuôi, tai + đuôi mèo).
- `Wander`: đi qua lại trên `sidewalkPatrol` (a↔b) bằng nội suy; bước chân nhấp nhô bằng `Math.sin(clock.elapsedTime * speed + phase)`; quay mặt theo hướng đi. **Mỗi avatar có `phase` ngẫu nhiên** (theo id, ổn định).
- `jump()` khi: vừa được cộng điểm, hoặc xe dừng gọi tên. Điều khiển bằng **ref/imperative** (không setState mỗi frame).
- `BlobShadow` (hình tròn phẳng `opacity 0.25`) dưới chân; **không `castShadow`** cho avatar/xe.
- Nếu có GLB: dùng `SkeletonUtils.clone` + `AnimationMixer` với tên clip chuẩn `Idle/Walk/Jump/Cheer`.

### 6.4 Xe tuần tra (`domain/vehicleFsm.ts` + `PatrolVehicle.tsx`)
FSM: `idle → manual ↔ idle`; `idle|manual → accelerating → cruising → decelerating → parked → cameraZoom → called → idle`.
- **Manual**: `W/A/S/D` & mũi tên (gia tốc, phanh, xoay có quán tính; giới hạn trên mặt đường – nếu ra khỏi đường thì giảm tốc/đẩy về). Khi vận tốc ≈ 0, tính `nearestLot` trong bán kính ngưỡng → hiện nút "Gọi trả bài".
- **Auto-pilot** (`planAutoDrive(graph, lots, calledHistory, rng)`): chọn lô đích **có trọng số** (ít được gọi hơn → xác suất cao hơn; không trùng lô vừa gọi); sinh đường đi qua `ringOrder` trong **4–5 giây** tăng tốc/cruise rồi giảm tốc **easeOut** dừng **chính xác tại `parkingPoint`** của lô, xe quay đúng `parkingHeading`. Hàm thuần, nhận `rng` để test tất định.
- Sau khi `parked`: Camera GSAP zoom vào `cameraFocus` của lô → mở `CalloutModal` → avatar nhảy + còi.
- Đóng popup → camera về toàn cảnh, xe `idle`. Cập nhật `calledHistory`, phát `GAME:STUDENT_CALLED`.
- Đổi loại xe: car (vàng, dễ thương), ambulance ("Trợ giúp"), ufo ("Câu hỏi khó", bay lơ lửng cao hơn, hiệu ứng tia sáng nhẹ) – **cùng giao diện điều khiển**, khác hình & thông số.
- **Hộp quà** (`GiftBoxes`): 2–3 hộp xoay trên đường, vị trí ngẫu nhiên (có seed) rải trên waypoint; va chạm bằng **khoảng cách 2D** (không dùng physics). Nếu xe chạm hộp trong lúc **đang gọi tên** (từ lúc auto-drive bắt đầu tới khi `called`) → học sinh được gọi nhận 1 `PerkCard` ngẫu nhiên (`double_points` | `ask_help` | `lucky_point`), hộp biến mất và hồi sinh ở chỗ khác sau ~20 giây. `lucky_point` = +1 điểm qua ledger (`reason:'perk:lucky_point'`). `double_points` dùng ở lần cộng điểm kế tiếp (nút "Dùng thẻ" trong Callout/Sidebar).

### 6.5 Thời tiết, Kỳ quan, hiệu ứng
- `sunny` (mặc định): ánh sáng ấm. `rainbow`: cầu vồng 3D (vài cung `TorusGeometry` mảnh, màu cầu vồng, bắc ngang) + ánh sáng tươi. `rainy`: bầu trời/sương tối, **mưa = 1 `Points`** (hoặc 1 InstancedMesh) cập nhật bằng shader/`useFrame` nhẹ, không tạo object mỗi frame. Chuyển thời tiết **làm mượt** (lerp màu sương/ánh sáng).
- `ClassWonder`: công trình ở bùng binh, **lớn dần theo `wonderProgress`** (ví dụ 5–6 giai đoạn: nền → tháp → vòm → ngọn cờ…); đạt mốc thì GSAP + confetti nhẹ.
- Level-up: `canvas-confetti` + nhà nảy + `fanfare`. Lúc cộng điểm: âm `+1/+2/+5`; trừ điểm: âm nhẹ.

### 6.6 Âm thanh (`platform/audio/soundEffects.ts`)
Web Audio API thuần: engine tick (khi auto-drive), còi, fanfare, ding cộng điểm, thud trừ điểm, nhận quà. `AudioContext` **tạo lười sau cú click đầu tiên** (autoplay policy), có `isMuted`, `dispose()` (close context). Đồng bộ `muted` với toolbar + event `AUDIO:MUTE_CHANGED`.

---

## 7. NẠP TÀI NGUYÊN 3D (`platform/assets/assetService.ts`)

- API: `get(assetId, {priority}) → Promise<LoadedAsset | null>`, `prefetch(ids, {priority:'low'})`, `release(assetId)`, `preloadUnique(ids)`, `stats()`.
- **Dedupe** theo `assetId@contentHash`: 1 request cho nhiều nơi gọi; **refCount**; về 0 + quá TTL → `dispose` geometry/material/texture; **LRU** theo ngân sách (mặc định ~200 MB ước lượng).
- **Hàng đợi ưu tiên**: `high` (level/avatar đang hiện) > `normal` (xe) > `low` (prefetch N+1, dùng `requestIdleCallback`/timeout). Tối đa **3 request song song**.
- **404/lỗi/timeout (8s)** → trả `null` + `telemetry.track('asset_missing')` → UI dùng Procedural. **Không** ném lỗi làm sập cảnh.
- GLTF: `GLTFLoader` (three-stdlib) + hỗ trợ `DRACOLoader`/`MeshoptDecoder` **chỉ khi file cần** (cấu hình lười, đường dẫn decoder để trong `public/`; chưa có file thì bỏ qua êm).
- `config/assetsRegistry.ts`: tách `SHARED` (`/shared-assets/models/*.glb`: avatar_*, prop_*) và `GAME` (`/games/classcity/models/*.glb`: `shop_level_1..20`, `vehicle_*`). Có hàm `urlFor(id)`.
- **Quét học sinh lớp** (`state/useCases.loadClassroom`): tập **unique** `level` & `avatarId` đang có → `preloadUnique`. **Pre-fetch N+1**: sau mỗi lần điểm đổi, với học sinh `needsPrefetch` → `prefetch(shop_level_{level+1}, low)`.
- Mô hình thật (khi có) phải có node neo `Anchor_Sign`, `Anchor_Topper`, `Anchor_Door`; `GltfShop` tìm node theo tên để gắn topper/biển. Nếu thiếu node → dùng vị trí mặc định theo bounding box.

---

## 8. HIỆU NĂNG (BẮT BUỘC – mục tiêu 60 FPS trên iGPU)

1. `<Canvas dpr={[1, 1.5]} gl={{ antialias:false, powerPreference:'high-performance' }}>`; `shadows` chỉ cho **công trình tĩnh** (shadow map nhỏ 1024) hoặc tắt hoàn toàn khi `PerfGovernor` hạ bậc. **Avatar & xe: không `castShadow`.**
2. `Instances` (drei) cho: cây xung quanh, đèn đường, vạch kẻ đường → mỗi loại 1 draw call. (Nếu cần, dùng `InstancedMesh` thủ công.)
3. Dùng chung geometry/material (cache theo key); `SkeletonUtils.clone` cho glb có skeleton.
4. **Nhãn tên**: `<Html distanceFactor transform? sprite?>` **không dùng `backdrop-filter`/blur**, `pointer-events:none`; chỉ render **nhãn đầy đủ** cho lô được chọn/hover/xe đang đỗ + các lô trong bán kính gần camera; các lô còn lại chỉ hiện **số thứ tự** nhỏ. Cập nhật tập "gần" **mỗi ~250 ms** (không mỗi frame).
5. `PerfGovernor` (drei `PerformanceMonitor`): hạ bậc `dpr 1.5→1` → giảm hạt mưa → giảm nhãn → tắt bóng đổ → ; hồi phục khi ổn định. Cho người dùng **"Chế độ tiết kiệm"** thủ công trong Toolbar/Settings.
6. `frameloop`: `always` (có avatar đi dạo), nhưng khi tab ẩn → R3F tự dừng; khi mở modal toàn màn hình có thể `demand` (tùy chọn).
7. **Không tạo object (`new Vector3`, mảng…) trong `useFrame`**; tái dùng biến module/`useRef`.
8. **Selector hẹp** (zustand + `useShallow`) để cộng điểm 1 học sinh chỉ re-render 1 `StudentLot`.
9. Đo bằng `renderer.info`: log (DEV) draw calls/triangles; mục tiêu **draw calls ≤ ~150**, tam giác ≤ ~400k với 40 lô cấp trộn.
10. `React.lazy` cho modal ít dùng (Leaderboard, Settings, ImportExport, Ecosystem).

---

## 9. GIAO DIỆN 2D

Tailwind v4 + `lucide-react`, bố cục: **canvas toàn màn hình**, **TopToolbar** phía trên (overlay), **StudentSidebar** bên phải (thu/gọn được), modal ở giữa. Dùng token màu thương hiệu (R10). Bàn phím truy cập được (focus ring, `aria-label`, `Esc` đóng modal). Toàn bộ chuỗi qua `t()`.

- **TopToolbar**: nút **Về sảnh**; chọn lớp (đa lớp bị khóa Free, hiện khóa); tiến độ **Kỳ Quan** (thanh %); **Auto Lái Gọi Tên**; đổi phương tiện (3 lựa chọn); thời tiết (3 chế độ); bật/tắt âm thanh; **Bảng xếp hạng**; **Cài đặt** (điểm/level, ngôn ngữ, chế độ tiết kiệm, tên thương hiệu); **Nhập/Xuất**.
- **StudentSidebar**: tìm kiếm + lọc (tên / số thứ tự / cấp độ / ngành hàng); danh sách học sinh (cuộn ảo nhẹ hoặc đơn giản vì ≤40); khi chọn: thẻ cửa hàng (tên, `Level N`, progress bar, thẻ đặc quyền đang có); nút điểm **`+1 Phát biểu`, `+2 Làm bài tốt`, `+5 Xuất sắc`, `-1 Nhắc nhở`** (tên nút qua `t()`); chọn **Avatar**, **Ngành hàng**, **Màu sơn** (bảng ≥12 màu pastel + ô nhập hex hợp lệ); click nhà 3D ⇄ chọn trong sidebar (đồng bộ 2 chiều, camera lia nhẹ tới lô).
- **CalloutModal**: *"Mời chủ cửa hàng số [X] – [Tên] lên trả bài!"*, các nút điểm nhanh, nút "Dùng thẻ", nút Đóng/Gọi bạn khác.
- **LeaderboardModal**: top cửa hàng theo `totalPoints` (huy chương top 3), nút xuất CSV (Pro; **chống CSV injection**: ô bắt đầu bằng `= + - @` thì thêm `'`).
- **ImportExportModal**: xuất `backup.json` (`schemaVersion`); nhập JSON hoặc CSV danh sách học sinh (`studentCode,name`), **validate nghiêm** (kiểu, độ dài tên ≤ 40, trùng mã, tối đa 40), hiển thị báo cáo lỗi từng dòng, **xác nhận trước khi ghi đè**.
- **EcosystemModal** (+ `shell/EcosystemDevPanel`): giả lập "ClassArena/ClassFarm cộng điểm cho học sinh X" bằng cách phát/nhận `EcoEvent` thật qua bus và ghi ledger với `gameId` khác → chứng minh nhà lên cấp **không reload**. Hiển thị log sự kiện, nút chuyển tier Free/Pro (dev).
- Trạng thái trống/lỗi: lớp chưa có học sinh → hướng dẫn nhập; WebGL không khả dụng → **Chế độ 2D danh sách** (Sidebar vẫn cộng điểm được); mất `webglcontextlost` → thông báo + khởi tạo lại.
- `ErrorBoundary` bọc `<Canvas>` **và** từng `StudentLot` (một mô hình lỗi không sập thành phố).

---

## 10. DỮ LIỆU MẪU (platform/adapters/localStorage/seed.ts)

- 1 giáo viên (`tier:'free'` mặc định, tenant `'local'`), **2 lớp**: "Lớp 5A" (**36 học sinh**) và "Lớp 5B" (**24 học sinh**, để thử chọn lớp/khóa Free).
- Tên **tiếng Việt thực tế, đa dạng** (họ + đệm + tên, ví dụ: Nguyễn Minh Anh, Trần Gia Bảo, Lê Khánh Chi, Phạm Đức Dũng, …), không trùng.
- Điểm ban đầu tạo **qua ledger** (nhiều giao dịch `gameId:'seed'`) sao cho **cấp độ trải đều 1–20** (có vài em level 1–3, nhiều em 4–12, vài em 15–20, **ít nhất 2 em ở level 19 thiếu ≤2 điểm lên 20**, để thử pre-fetch/level-up). Dùng PRNG có seed (`mulberry32`) để **tất định**.
- Ngành hàng, màu pastel (bảng cố định ≥12 màu), avatar phân bố ngẫu nhiên có seed.
- Seed chỉ chạy khi chưa có dữ liệu; có nút "Đặt lại dữ liệu mẫu" trong Settings (có xác nhận).

---

## 11. KẾ HOẠCH THỰC THI THEO GIAI ĐOẠN (làm tuần tự; mỗi bước phải qua cổng kiểm)

Sau **mỗi giai đoạn**: `npm.cmd run verify` (= `tsc -b` + `oxlint` + `check:boundaries` + `vitest run`) phải xanh. Không sang giai đoạn sau khi chưa xanh.

### GĐ0 – Nền tảng dự án
1. Dọn template Vite; cấu hình Tailwind v4 (`@tailwindcss/vite`, `@import "tailwindcss"`); cài `vitest` (+ `jsdom` nếu cần) & thêm scripts: `verify`, `test`, `check:boundaries`.
2. Tạo toàn bộ **cây thư mục §3** (file rỗng/skeleton có export) + script `check-boundaries.mjs`.
3. **Cổng:** build sạch, `verify` xanh, trang trắng chạy được.

### GĐ1 – Platform layer (không 3D)
1. `models.ts`, `events.ts`, `manifest.ts`, ports, `storage.ts` (namespace/version/migration), `LocalStorageAdapter`, `InMemoryAdapter`, `createRepositories`, `seed.ts`.
2. `eventBus`, `entitlements`, `permissions`, `i18n` (vi/en), `theme`, `telemetry`, `backup`.
3. **Contract tests** chạy **cùng một bộ test** cho cả hai adapter: award idempotent; totals = tổng delta; `rev` conflict; import batch validate; migration chạy.
4. **Cổng:** test xanh; `grep localStorage` ngoài adapter = 0.

### GĐ2 – Domain ClassCity (thuần TS)
1. `levels.ts`, `perks.ts`, `pathing.ts`, `vehicleFsm.ts` (+ `planAutoDrive`), `selectors.ts`, `cityLayout.ts`.
2. Unit tests: ranh giới level (0/4/5/…/ppl×19/vượt 20), âm điểm, `needsPrefetch`, planner tất định với seed (luôn dừng đúng parkingPoint, 4–5 s, không trùng lô vừa gọi), layout (40 lô không chồng nhau, mỗi lô có waypoint hợp lệ, camera không bị che).
3. **Cổng:** coverage logic domain cốt lõi; verify xanh.

### GĐ3 – State & use-cases
1. `useClassStore` (slices: session, roster, cityState, vehicle, ui, assets) + `useCases` (`loadClassroom`, `awardPoints` lạc quan + ghi ledger + emit event + trigger level-up/prefetch, `callStudent`, `changeAvatar/Branch/Color`, `updateSettings`, `applyRemoteAward` từ bus).
2. `awardPoints`: tính level cũ/mới bằng domain → cập nhật store → `ledger.award` (idempotencyKey = uuid) → phát `LEDGER:POINTS_AWARDED`; nếu thất bại → rollback + toast.
3. Test use-cases với `InMemoryAdapter` (không cần React/three).

### GĐ4 – Cảnh 3D tĩnh
`ClassCityModule`, `CityScene` (ánh sáng, bầu trời, `PerfGovernor`), `RoadNetwork` (đường, vạch, vỉa hè, cây, đèn bằng Instances), `StudentLot` ×36 với `ShopModel/ShopProcedural` (20 cấp + topper) và nhãn tối ưu, `ClassWonder` giai đoạn 1, `CameraController` (overview + OrbitControls giới hạn góc/zoom).
**Cổng (xem bằng trình duyệt):** thấy 36 cửa hàng màu sắc, số thứ tự, level đa dạng, ≥ 30 FPS đo được, console sạch.

### GĐ5 – Sống động
`Avatar3D` + wander + jump + `BlobShadow`; `PatrolVehicle` (3 loại) với Manual + Auto-pilot; `GiftBoxes`; `CameraController` follow/focus (GSAP, kill tween cũ); `Weather` (3 chế độ); `ClassWonder` đủ các giai đoạn.
**Cổng:** bấm Auto Lái → xe chạy mượt 4–5s → dừng đúng nhà → camera zoom → popup; WASD hoạt động.

### GĐ6 – UI 2D
`TopToolbar`, `StudentSidebar`, `CalloutModal`, `LeaderboardModal`, `SettingsModal`, `ImportExportModal`, `EcosystemModal`; hiệu ứng level-up (confetti + bounce + fanfare); âm thanh; khóa Free/Pro.
**Cổng:** cộng điểm → thanh tiến trình chạy → đủ điểm → pháo hoa + nhà đổi dáng cao hơn.

### GĐ7 – Hub tối giản & hệ sinh thái
`Shell`, `GameHost` (mount/unmount, ErrorBoundary, fallback 2D), `gameRegistry`, màn hình chọn game (1 thẻ thật + vài thẻ "Sắp ra mắt"), `EcosystemDevPanel`.
**Cổng:** Về sảnh → vào lại game: **không rò rỉ** (số listener bàn phím, `AudioContext` đã `close`, tween GSAP đã kill, `renderer.info.memory` về mức ban đầu). Đổi tier Free⇄Pro đổi quyền ngay.

### GĐ8 – Hoàn thiện & nghiệm thu
Hiệu năng (đo `renderer.info`, thử `PerfGovernor`), a11y, trạng thái trống/lỗi, i18n quét chuỗi cứng, README (cách chạy, kiến trúc, cách thêm game mới trong 10 bước), kiểm thử thủ công toàn bộ **Định nghĩa Hoàn thành** (§12).

---

## 12. ĐỊNH NGHĨA HOÀN THÀNH (DoD) – phải tự kiểm chứng bằng chạy thật

Chạy `npm.cmd run dev`, mở bằng trình duyệt (dùng công cụ trình duyệt của bạn), xác nhận **từng mục**, kèm ảnh chụp màn hình:

- [ ] `npm.cmd run verify` xanh (tsc + oxlint + boundaries + vitest); `npm.cmd run build` thành công.
- [ ] Thành phố 3D hiển thị **36 cửa hàng** pastel, có số thứ tự, **mức cấp độ khác nhau rõ rệt về hình dáng** (từ sạp đến tháp), có topper ngành hàng.
- [ ] Mỗi lô có avatar đi dạo trước cửa; ô tô chạy được bằng `WASD`/mũi tên.
- [ ] **Auto Lái Gọi Tên:** xe tăng tốc ~4–5 s → giảm tốc → **dừng trước đúng một nhà** → camera GSAP zoom mặt tiền (không bị che) → popup *"Mời chủ cửa hàng số X – Tên lên trả bài!"* + nút cộng điểm; avatar nhảy; có âm còi.
- [ ] Cộng điểm đến ngưỡng → **confetti + nhà nảy lên và đổi sang cấp mới cao hơn**; thanh tiến trình đúng; trừ điểm không xuống dưới 0.
- [ ] Hộp quà: xe chạm trong lúc gọi tên → học sinh nhận thẻ đặc quyền, hiện trong Sidebar.
- [ ] Thời tiết 3 chế độ hoạt động; Kỳ Quan lớn dần khi tổng điểm lớp tăng.
- [ ] Đổi avatar/ngành hàng/màu sơn có hiệu lực ngay & **lưu bền sau reload**.
- [ ] Đổi `pointsPerLevel` → mọi cấp độ tính lại đúng.
- [ ] Nhập CSV hợp lệ/không hợp lệ (báo lỗi đúng dòng); xuất/nhập `backup.json` khôi phục nguyên trạng.
- [ ] Pre-fetch N+1: học sinh thiếu ≤2 điểm → có request nền (kiểm tra trong tab Network/log DEV) trước khi cộng.
- [ ] `EcosystemDevPanel` giả lập game khác cộng điểm → nhà lên cấp **không cần tải lại**; mở **2 tab** cũng đồng bộ (BroadcastChannel).
- [ ] Free: khóa đa lớp/xuất CSV hiện đúng; Pro mở khóa.
- [ ] Về sảnh ⇄ vào lại nhiều lần: **không rò listener/AudioContext/tween**; console không lỗi/cảnh báo.
- [ ] Chuyển ngôn ngữ vi⇄en đổi chuỗi chính; `grep` không còn chuỗi tiếng Việt cứng trong `.tsx`.
- [ ] FPS ≥ 30 ổn định (mục tiêu 60) trên máy đo; `renderer.info.render.calls` ≤ ~150 ở cảnh đầy đủ.

---

## 13. QUY TẮC LÀM VIỆC CHO AGENT

1. Làm **tuần tự theo giai đoạn §11**; cuối mỗi giai đoạn chạy `verify` và (từ GĐ4) **xem thực tế trên trình duyệt**. Đừng báo "xong" khi chưa kiểm chứng.
2. Gặp mâu thuẫn/không rõ: **hỏi người dùng**, đừng tự đổi các mục "ĐÃ CHỐT".
3. Công nghệ đã chốt nằm ở **mục 1A của `02-system-architecture.md`**. Không thêm thư viện ngoài danh sách đã cài **trừ**: `vitest` (+ `jsdom`/`@testing-library/react` nếu cần), `zod` (validate import/backup/event), `prettier`, `idb` (chỉ khi làm Outbox), và `@playwright/test` (E2E). Không cài Next.js/TanStack Query/PWA/Stripe/Sentry ở giai đoạn này (backend Spring Boot nằm ngoài dự án client). Thư viện khác: nêu lý do và hỏi người dùng.
4. Giữ code nhỏ, tách module; mỗi file một trách nhiệm; comment ngắn giải thích *vì sao* ở chỗ không hiển nhiên (đặc biệt chỗ tối ưu hiệu năng và dispose).
5. Mọi tài nguyên bất đồng bộ/lắng nghe trong `useEffect` phải có cleanup; mọi tween GSAP phải lưu để `kill`.
6. Không hard-code chuỗi UI, màu thương hiệu, hay truy cập `localStorage` ngoài adapter (R1, R8, R10).
7. Cuối cùng viết `README.md`: cách chạy (`npm.cmd`), sơ đồ kiến trúc ngắn, **"Cách thêm một game mới"** (tạo `games/<id>/`, viết manifest, đăng ký vào `gameRegistry`, dùng `GameContext`), cách thay adapter, cách thêm gói/feature, cách thêm ngôn ngữ, cách thêm mô hình `.glb` (quy ước neo, tên animation, nén).
