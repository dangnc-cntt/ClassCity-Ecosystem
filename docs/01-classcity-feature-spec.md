# DỰ ÁN: CLASSCITY 3D - NỀN TẢNG GAMIFICATION QUẢN LÝ LỚP HỌC (SAAS & ECOSYSTEM-READY)

## VAI TRÒ CỦA BẠN (AI AGENT / GOOGLE ANTIGRAVITY)
Hãy đóng vai một **Principal Software Architect** và **Senior Creative Developer** chuyên sâu về **React, TypeScript và Three.js (React Three Fiber)**. Nhiệm vụ của bạn là xây dựng hoàn chỉnh ứng dụng web 3D quản lý lớp học mang tên **"ClassCity"**, tuân thủ nghiêm ngặt:
1. **Kiến trúc thương mại (SaaS) & Hệ sinh thái Đa trò chơi (Multi-Game Ecosystem):** Sẵn sàng hoạt động độc lập (Standalone) hoặc nhúng làm một phân hệ (Game Module) trong một siêu ứng dụng/hệ sinh thái nhiều trò chơi giáo dục khác (VD: *ClassFarm*, *ClassArena*, *ClassRace*...).
2. **Cơ chế tải tài nguyên 3D thông minh (On-Demand Loading & Clean Disposal).**
3. **Tối ưu hóa hiệu năng cao nhất (60 FPS)** cho máy tính văn phòng không có card đồ họa rời.

---

## 1. BỘ CÔNG NGHỆ SỬ DỤNG (TECH STACK)
* **Core Framework:** Vite + React + TypeScript.
* **Đồ họa 3D:** `three`, `@types/three`, `@react-three/fiber`, `@react-three/drei`, `three-stdlib` (dùng `SkeletonUtils`).
* **Hiệu ứng, Hoạt ảnh & Âm thanh:** `gsap` (chuyển động camera, hiệu ứng nhà nảy lên khi thăng cấp), `canvas-confetti` (`@types/canvas-confetti` - bắn pháo hoa), **Web Audio API thuần code** (hiệu ứng âm thanh tương tác không cần file âm thanh ngoài).
* **Giao diện 2D (UI):** Tailwind CSS + `lucide-react` (Icons).
* **Quản lý State & Dữ liệu:** `zustand` (kết hợp Repository Pattern qua lớp `api.ts` và cổng giao tiếp hệ sinh thái `ecosystemBridge.ts`).

---

## 2. KIẾN TRÚC DATABASE & KHO MÔ HÌNH 3D DÙNG CHUNG TOÀN HỆ SINH THÁI (SHARED DB & SHARED ASSET CDN)
Tuyệt đối không viết trực tiếp logic `localStorage` lộn xộn trong các Component 3D hay UI. Toàn bộ các trò chơi trong hệ sinh thái (*ClassCity*, *ClassFarm*, *ClassArena*, *ClassRace*...) **dùng chung 1 Cơ sở dữ liệu (Single Unified Database)** và **dùng chung 1 Kho tài nguyên 3D (Shared 3D Asset Catalog / CDN)**.

Giáo viên chỉ cần tạo lớp và nhập danh sách học sinh **1 lần duy nhất**; học sinh đổi nhân vật 3D (Avatar), thú cưng hoặc tích lũy điểm ở trò chơi này sẽ tự động xuất hiện nguyên vẹn ở trò chơi khác.

1. **Tạo file `src/types/models.ts` (Thiết kế Schema Chuẩn Shared Database):**
   * **A. Các Bảng Dùng Chung Toàn Hệ Sinh Thái (Shared Core Tables):**
     * `TeacherProfile` (Bảng `teachers`): `id`, `name`, `email`, `subscriptionTier` (`'free' | 'pro'`).
     * `ClassroomCore` (Bảng `classrooms`): `id`, `teacherId`, `name` (VD: "Lớp 5A"), `createdAt`.
     * `StudentCore` (Bảng `students`): `id`, `classroomId`, `studentCode` (1..40), `name`, `totalPoints` (điểm XP tích lũy), `walletCoins` (xu dùng chung để mua đồ), `equippedAvatarId` (nhân vật 3D mặc định mang đi mọi trò chơi), `unlockedAssetIds` (danh sách ID mô hình 3D học sinh đã sở hữu).
     * `SharedAsset3D` (Bảng `assets_catalog` - Danh mục Mô hình 3D Dùng Chung):
       * `id` (VD: `'avatar_knight'`, `'vehicle_ufo'`, `'prop_pine_tree'`), `category` (`'avatar' | 'vehicle' | 'building' | 'prop' | 'pet'`), `name`, `glbUrl` (đường dẫn CDN chung `/shared-assets/models/...`), `compatibleGames` (`GameId[]` hoặc `'*'` nếu dùng cho mọi game), `scale`, `yOffset`.
     * `PointTransaction` (Bảng `point_transactions` - Sổ cái điểm chung): `id`, `studentId`, `classroomId`, `gameId` (`'classcity' | 'classfarm' | 'classarena' | ...`), `delta`, `reason`, `timestamp`.
   * **B. Bảng Trạng Thái Riêng Theo Từng Game (`classroom_game_states` & `student_game_states`):**
     * Trong DB thực tế (PostgreSQL), đây là bảng liên kết `(student_id, game_id)` chứa dữ liệu mở rộng của từng game:
     * `ClassroomCityState` (`gameId = 'classcity'`): `pointsPerLevel` (số điểm cần để lên 1 cấp), `wonderProgress` (điểm xây Kỳ quan chung), `weatherMode` (`'sunny' | 'rainy' | 'rainbow'`).
     * `StudentCityState` (`gameId = 'classcity'`): `lotNumber` (từ 1 đến 40), `level` (từ 1 đến 20), `shopBranch` (`'bakery' | 'cafe' | 'bookstore' | 'petshop' | 'gamecenter'`), `shopColor` (mã màu hex pastel), `perks` (danh sách Thẻ Đặc Quyền thu thập được).
     * `Classroom` & `Student`: View/Composite Interface kết hợp giữa `Shared Core` + `ClassCity State` (trong đó `avatarId` của học sinh lấy trực tiếp từ `equippedAvatarId` chung của hệ sinh thái).

2. **Tạo file `src/services/api.ts` (Shared Repository Pattern):**
   * Cung cấp các hàm `async/await` chuẩn REST/GraphQL giả lập việc truy vấn **Database Dùng Chung**:
     * **API Lõi (Shared DB APIs):** `fetchTeacherProfile()`, `fetchClassrooms()`, `fetchStudentsCore()`, `updateStudentGlobalAvatar()`, `addEcosystemPoints()`, `fetchSharedAssetsCatalog()`.
     * **API Mở rộng cho ClassCity:** `fetchClassCityState()`, `updateStudentShopState()`, `updateClassroomCitySettings()`, `importStudentsBatch()`, `exportEcosystemBackupJSON()`.
   * Trong môi trường phát triển, dữ liệu được lưu tách bạch trong `localStorage` theo đúng cấu trúc bảng DB dùng chung (`db_shared_teachers`, `db_shared_classrooms`, `db_shared_students`, `db_shared_transactions`, `db_shared_assets_catalog` và `db_game_classcity_state`) để bất kỳ trò chơi nào khác mở lên trên cùng domain đều đọc được ngay người dùng, học sinh và nhân vật 3D.
   * Khởi tạo sẵn dữ liệu mẫu (Mock Data) gồm 36 học sinh với tên tiếng Việt, màu sắc pastel, ngành hàng và cấp độ ngẫu nhiên để kiểm thử ngay.

3. **Tạo file `src/services/ecosystemBridge.ts` (Cổng giao tiếp Liên Trò Chơi / Micro-Frontend Ready):**
   * Định nghĩa chuẩn giao tiếp (`EcosystemEventBus`) hỗ trợ cả `window.CustomEvent`, `BroadcastChannel` (đồng bộ tức thì giữa nhiều tab trò chơi đang mở) và `window.postMessage`:
     * **Lắng nghe từ Hệ sinh thái:** Đồng bộ khi điểm hoặc Avatar 3D của học sinh thay đổi từ trò chơi khác (`ECOSYSTEM:POINTS_SYNC`, `ECOSYSTEM:AVATAR_CHANGED`), đổi lớp học (`ECOSYSTEM:CLASSROOM_CHANGE`), hoặc bật/tắt âm thanh toàn cục (`ECOSYSTEM:AUDIO_TOGGLE`).
     * **Phát tín hiệu ra Hệ sinh thái:** Thông báo khi cộng điểm trong ClassCity (`CLASSCITY:POINTS_AWARDED`), khi học sinh đổi Avatar 3D (`CLASSCITY:AVATAR_UPDATED`), khi xe tuần tra gọi tên một học sinh (`CLASSCITY:STUDENT_CALLED`), hoặc khi quay về sảnh chính (`CLASSCITY:EXIT_TO_HUB`).
   * Đóng gói toàn bộ trò chơi trong Component `<ClassCityModule />` (được render bên trong `App.tsx` kèm thanh chuyển đổi nhanh giả lập "Game Hub Ecosystem" để kiểm thử khả năng dùng chung DB và nhân vật 3D).

4. **Tạo file `src/services/soundEffects.ts` (Hệ thống Âm thanh Procedural Web Audio API):**
   * Sử dụng `AudioContext` thuần code (không phụ thuộc file `.mp3`/`.wav` bên ngoài) để tổng hợp âm thanh sống động cho lớp học:
     * Tiếng động cơ/quay số tích tắc khi xe chạy Auto-Pilot.
     * Tiếng còi xe vui nhộn khi dừng trước cửa hàng gọi tên.
     * Giai điệu Fanfare chiến thắng khi cửa hàng thăng cấp (Level Up) hoặc mở được Hộp quà Bí ẩn.
     * Tiếng cộng điểm (`+1`, `+2`, `+5`) và âm báo nhẹ khi trừ điểm nhắc nhở.
   * Có trạng thái `isMuted` đồng bộ với `TopToolbar` và `ecosystemBridge`.

---

## 3. KHO MÔ HÌNH 3D DÙNG CHUNG & TẢI THEO NHU CẦU (SHARED CDN, ON-DEMAND & PRE-FETCHING)
Toàn bộ mô hình `.glb` được quản lý qua một **Shared Asset Registry / CDN chung cho cả hệ sinh thái**. Khi trình duyệt đã tải mô hình nhân vật `avatar_knight.glb` hoặc cây xanh ở *ClassCity*, bộ nhớ đệm (HTTP Cache / IndexedDB) sẽ tái sử dụng ngay lập tức khi học sinh chuyển sang chơi *ClassFarm* hoặc *ClassArena* mà không tốn băng thông tải lại:

1. **Tạo file `src/config/assetsRegistry.ts` (Shared 3D Asset Registry):**
   * Phân chia rõ 2 nhóm tài nguyên 3D:
     * **Shared Ecosystem Assets (`/shared-assets/models/...`):** Dùng chung cho mọi trò chơi trong hệ sinh thái:
       * Nhân vật học sinh (`avatar_knight.glb`, `avatar_mage.glb`, `avatar_astronaut.glb`, `avatar_dino.glb`, `avatar_cat.glb`...) kèm chuẩn tên Animation chung (`Idle`, `Walk`, `Jump`, `Cheer`) để trò chơi nào cũng điều khiển được.
       * Đạo cụ môi trường & phần thưởng dùng chung (`prop_tree.glb`, `prop_mystery_box.glb`).
     * **ClassCity Specific Assets (`/games/classcity/models/...`):** Dùng riêng cho trò ClassCity:
       * 20 cấp độ cửa hàng (`shop_level_1.glb` đến `shop_level_20.glb`).
       * Các phương tiện tuần tra (`vehicle_car.glb`, `vehicle_ambulance.glb`, `vehicle_ufo.glb`).
2. **Quản lý tải thông minh (Deduplication, Pre-fetching & Disposal):**
   * Khi mở một `Classroom`, hệ thống quét danh sách học sinh của lớp đó để lọc ra tập hợp duy nhất (Unique Set) các `level` và `avatarId` đang thực sự xuất hiện trong lớp. Chỉ nạp vào bộ nhớ những mô hình này.
   * **Cơ chế Pre-fetch $N+1$:** Tự động kiểm tra những học sinh sắp đủ điểm lên cấp tiếp theo (còn thiếu $\le 2$ điểm) và gọi tải ngầm mô hình của cấp độ `level + 1` ở chế độ Background để khi giáo viên bấm cộng điểm, nhà mới xuất hiện tức thì không bị trễ mạng.
   * **Cơ chế Giải phóng Tài nguyên khi Chuyển Game (Clean Unmount):** Đảm bảo khi đóng `<ClassCityModule />` để chuyển sang trò chơi khác trên Hệ sinh thái, toàn bộ GSAP Timelines, bộ lắng nghe bàn phím (`WASD`), `AudioContext` và bộ nhớ WebGL đều được dọn dẹp sạch sẽ.
3. **Cơ chế Procedural Fallback & Biểu tượng Ngành hàng 3D (BẮT BUỘC):**
   * Vì trong môi trường phát triển ban đầu có thể chưa có sẵn các file `.glb` thực tế trong thư mục `/public/models/`, hãy viết các Component 3D Fallback bằng khối hình học Three.js (`<ShopProcedural />`, `<AvatarProcedural />`, `<VehicleProcedural />`).
   * **Quy tắc vẽ `<ShopProcedural level={1..20} color={shopColor} branch={shopBranch} />`:**
     * Level 1–4: Sạp hàng nhỏ 1 tầng, có mái hiên sọc trắng + màu pastel.
     * Level 5–9: Cửa hàng 1 tầng kiên cố, có biển hiệu trên nóc, cửa kính, 1 cây xanh bên cạnh.
     * Level 10–14: Tòa nhà 2 tầng sầm uất, có ban công, biển hiệu xoay, 2 cây cảnh, đèn trang trí.
     * Level 15–19: Siêu cửa hàng 3 tầng hiện đại, có mái vòm/trang trí đặc biệt trên đỉnh.
     * Level 20 (Siêu Cửa Hàng): Tòa tháp thương mại hoành tráng 4 tầng, có vương miện/ngôi sao vàng xoay lấp lánh trên đỉnh và vòng sáng dưới đất.
   * **Biểu tượng 3D đặc trưng theo Ngành hàng (`shopBranch` Topper):** Đặt trên mái hoặc biển hiệu của từng cửa hàng để nhìn vào biết ngay loại hình kinh doanh:
     * `bakery`: Mô hình bánh kem / bánh sừng bò 3D.
     * `cafe`: Mô hình cốc cà phê bốc khói nhẹ.
     * `bookstore`: Mô hình cuốn sách mở / chồng sách 3D.
     * `petshop`: Mô hình dấu chân thú cưng / tai mèo 3D dễ thương.
     * `gamecenter`: Mô hình tay cầm chơi game (Gamepad) / khối Pixel phát sáng.

---

## 4. TỐI ƯU HÓA HIỆU NĂNG 3D (CHỐNG ĐƠ MÁY VĂN PHÒNG - 60 FPS)
Bắt buộc áp dụng 5 kỹ thuật sau trong không gian `<Canvas>`:
1. **Giới hạn độ phân giải:** Thiết lập `<Canvas dpr={[1, 1.5]}>` để không làm quá tải GPU trên màn hình độ phân giải cao.
2. **Không dùng Dynamic Shadows cho nhân vật & xe:** Tuyệt đối không bật `castShadow` cho 40 nhân vật đi bộ. Thay vào đó, tạo một Component `<BlobShadow />` (một hình tròn phẳng màu đen mờ `opacity: 0.25` nằm sát mặt đất) gắn trực tiếp dưới chân mỗi nhân vật và xe ô tô.
3. **Sử dụng `<Instances>` (InstancedMesh):** Toàn bộ cây cối trang trí xung quanh thành phố, đèn đường, vạch kẻ đường trắng phải được vẽ bằng `<Instances>` của `@react-three/drei` để gom thành 1 Draw Call duy nhất.
4. **Chia sẻ bộ xương & hình học:** Sử dụng `SkeletonUtils.clone()` khi nhân bản các mô hình `.glb` nhân vật có hoạt ảnh và dùng chung `Geometry` / `Material` cho các khối cơ bản.
5. **Tối ưu nhãn tên cửa hàng (`<Html>` kết hợp hiệu năng cao):** Mỗi cửa hàng có một biển số thứ tự và tên học sinh lơ lửng phía trên. Sử dụng thuộc tính `distanceFactor`, tắt `backdrop-filter: blur()` nặng nề trên 40 nhãn cùng lúc, và ưu tiên hiển thị nổi bật cho cửa hàng đang được chọn / hover hoặc xe đang đỗ trước cửa để không gây giật lag khi xoay bản đồ.

---

## 5. CÁC TÍNH NĂNG CỐT LÕI & ĐỘT PHÁ SÁNG TẠO CẦN XÂY DỰNG

### A. Quy hoạch Đô thị, Tọa độ Điểm đỗ xe & Môi trường 3D
* Mặt đất màu xanh lá tươi sáng, ở giữa là hệ thống đường nhựa khép kín (dạng vòng lặp chữ nhật có đường cắt ngang ở giữa) giúp xe ô tô có thể chạy vòng quanh.
* Dọc theo các con đường là 36–40 ô đất được đánh số rõ ràng. Mỗi ô đất chứa: Cửa hàng của học sinh + Nhân vật đại diện của học sinh đó.
* **Quy hoạch Điểm đỗ xe (`roadWaypoint`) & Góc nhìn Camera (`cameraFocusOffset`):** Mỗi ô đất (1–40) được tính toán sẵn tọa độ mặt tiền quay ra làn đường gần nhất, điểm dừng xe tương ứng trên mặt đường và vector vị trí Camera nhìn trực diện vào mặt tiền cửa hàng đó (đảm bảo khi GSAP zoom vào bất kỳ cửa hàng nào cũng không bị tòa nhà cấp 20 ở dãy đối diện che khuất).
* **Trung tâm thành phố:** Đặt một khu đất chung hiển thị **"Kỳ Quan Lớp Học"** (tự động lớn dần khi tổng điểm cả lớp tăng lên).
* **Chế độ Thời tiết theo Trật tự lớp:** Giáo viên có nút chuyển đổi nhanh trên thanh công cụ:
  * *Nắng đẹp (Mặc định):* Bầu trời sáng, ánh nắng ấm áp.
  * *Cầu vồng (Khen thưởng):* Xuất hiện cầu vồng 3D rực rỡ bắc ngang thành phố.
  * *Mưa giông (Cảnh báo khi lớp ồn):* Bầu trời tối lại, có hiệu ứng hạt mưa rơi để nhắc nhở học sinh giữ trật tự.

### B. Hệ thống Nhân vật Học sinh đi dạo (Animated Student Avatars)
* Mỗi học sinh có 1 nhân vật 3D đứng hoặc đi bộ thong thả (`Wander`) trên vỉa hè ngay trước cửa hàng của mình (dùng hàm `Math.sin(clock.elapsedTime)` để tạo chuyển động bước đi nhấp nhô mượt mà).
* Học sinh được chọn đổi hình dáng nhân vật trong hồ sơ (Hiệp sĩ, Phù thủy, Phi hành gia, Khủng long, Mèo dễ thương...).
* Khi cửa hàng được cộng điểm hoặc khi xe ô tô dừng lại gọi tên, nhân vật của học sinh đó nhảy tưng bừng tại chỗ.

### C. Phương tiện Tuần tra Gọi tên Trả bài (Manual & Auto-Pilot)
* Đặt phương tiện (Mặc định: Ô tô vàng dễ thương; có thể đổi sang Xe cứu thương "Trợ giúp" hoặc Đĩa bay UFO "Câu hỏi khó") trên làn đường.
* **Chế độ Lái thủ công (Manual):** Giáo viên dùng các phím `W, A, S, D` hoặc phím Mũi tên để tự lái xe chạy quanh phố. Khi dừng lại, hệ thống tự động xác định cửa hàng nào đang ở gần xe nhất và hiển thị nút *"Gọi trả bài"*.
* **Chế độ Tự lái ngẫu nhiên (Auto-Pilot):** Khi giáo viên bấm nút **"Quay số / Auto Lái"**:
  * Xe tự động tăng tốc chạy dọc theo các điểm nút (Waypoints) của con đường quanh thành phố trong khoảng 4–5 giây (kèm âm thanh quay số).
  * Camera tự động lia theo xe hoặc xoay toàn cảnh.
  * Xe giảm tốc từ từ và dừng lại ngẫu nhiên ngay tại `roadWaypoint` trước cửa hàng của một học sinh.
  * Camera lập tức phóng to (Zoom) mượt mà bằng GSAP vào đúng góc nhìn mặt tiền của cửa hàng đó, phát tiếng còi vui nhộn và hiển thị Popup nổi bật: **"Mời chủ cửa hàng số [X] - [Tên Học Sinh] lên trả bài!"** kèm các nút cộng điểm nhanh ngay trên Popup.
* **Hộp quà Bí ẩn trên đường:** Rải ngẫu nhiên 2–3 hộp quà 3D xoay tròn trên mặt đường. Nếu xe đi qua hộp quà trong lúc gọi tên, học sinh được gọi sẽ nhận được một "Thẻ Đặc Quyền" ngẫu nhiên (VD: *Nhân đôi điểm câu trả lời*, *Được nhờ 1 bạn cứu trợ*, *Cộng thêm 1 điểm may mắn*) lưu vào hồ sơ.

### D. Giao diện Quản lý Lớp học & Thanh Hệ sinh thái (UI 2D)
* **Top Bar:**
  * Nút **Cổng Hệ Sinh Thái (Ecosystem Hub Switcher):** Cho phép xem trạng thái kết nối với hệ sinh thái trò chơi (VD: thử nghiệm đồng bộ điểm từ *ClassArena / Đấu Trường Trắc Nghiệm* hoặc *ClassFarm / Nông Trại Lớp Học* sang *ClassCity* theo thời gian thực).
  * Chọn lớp học (Lớp 5A, 5B...), hiển thị tiến độ xây Kỳ Quan chung của lớp.
  * Nút điều khiển xe: *Auto Lái Gọi Tên*, *Đổi phương tiện (Ô tô / Cứu thương / UFO)*, *Đổi thời tiết*, *Bật/Tắt âm thanh*, *Xem Bảng Xếp Hạng Thịnh Vượng (Top cửa hàng cuối kỳ)*.
  * Nút *Cài đặt quy tắc điểm* (VD: 5 điểm = 1 Level) và *Nhập/Xuất dữ liệu lớp học (JSON chuẩn Ecosystem)*.
* **Right Sidebar (Bảng chi tiết):**
  * Thanh tìm kiếm hoặc lọc học sinh theo tên / số thứ tự / cấp độ / ngành hàng.
  * Khi chọn 1 học sinh (từ danh sách hoặc click trực tiếp vào ngôi nhà 3D trên bản đồ):
    * Hiển thị Thẻ thông tin cửa hàng: Tên học sinh, Cấp độ hiện tại (Level 1–20), Thanh tiến trình (Progress Bar) tới cấp tiếp theo, các Thẻ Đặc Quyền đang sở hữu.
    * Các nút cộng/trừ điểm nhanh (`+1 Phát biểu`, `+2 Làm bài tốt`, `+5 Xuất sắc`, `-1 Nhắc nhở`).
    * Nút chọn đổi **Nhân vật đại diện (Avatar)**, **Ngành hàng (`shopBranch`)** và **Màu sơn cửa hàng (`shopColor`)**.
  * Khi học sinh đủ điểm tăng cấp: Kích hoạt hiệu ứng pháo hoa (`canvas-confetti`), âm thanh chiến thắng và làm ngôi nhà 3D của học sinh đó nảy lên cao rồi biến hình sang cấp độ mới.

---

## 6. CẤU TRÚC THƯ MỤC ĐỀ XUẤT
Hãy tổ chức code sạch sẽ, chia nhỏ module rõ ràng theo cấu trúc sau:
```text
src/
├── config/
│   ├── assetsRegistry.ts       # Quản lý đường dẫn file .glb & cấu hình màu sắc, nhân vật, ngành hàng
│   └── cityLayout.ts           # Quy hoạch tọa độ 40 ô đất, roadWaypoint & góc nhìn camera không bị khuất
├── types/
│   └── models.ts               # Định nghĩa TypeScript Interfaces chuẩn SaaS & Multi-Game Ecosystem
├── services/
│   ├── api.ts                  # Lớp giao tiếp dữ liệu (Repository Pattern - Shared Core + Game State)
│   ├── ecosystemBridge.ts      # Event Bus & SDK kết nối ClassCity với các trò chơi khác trong Hệ sinh thái
│   └── soundEffects.ts         # Bộ tổng hợp âm thanh Web Audio API thuần code
├── store/
│   └── useClassStore.ts        # Zustand store quản lý trạng thái ứng dụng, đồng bộ Ecosystem & Pre-fetching
├── components/
│   ├── canvas/
│   │   ├── CityScene.tsx       # Khung cảnh 3D chính, Ánh sáng, Thời tiết, Camera Controller (GSAP)
│   │   ├── RoadNetwork.tsx     # Mặt đất, đường nhựa, vỉa hè, cây cối, hộp quà bí ẩn (dùng InstancedMesh)
│   │   ├── StudentLot.tsx      # Ô đất gồm: Cửa hàng 3D + Nhân vật đi bộ + Nhãn tối ưu
│   │   ├── ShopProcedural.tsx  # Logic vẽ 20 cấp độ cửa hàng 3D + Biểu tượng ngành hàng (Fallback + GLTF)
│   │   ├── Avatar3D.tsx        # Nhân vật học sinh đi bộ, nhảy mừng + Blob Shadow
│   │   ├── PatrolVehicle.tsx   # Xe ô tô / Cứu thương / UFO điều khiển bằng phím & thuật toán Auto-Pilot
│   │   └── ClassWonder.tsx     # Công trình Kỳ quan chung ở trung tâm thành phố
│   └── ui/
│       ├── TopToolbar.tsx      # Thanh điều khiển xe, thời tiết, âm thanh, chọn lớp, cài đặt & Ecosystem Hub
│       ├── StudentSidebar.tsx  # Bảng danh sách học sinh, cộng điểm, đổi nhân vật/ngành hàng/màu sơn
│       ├── CalloutModal.tsx    # Popup vinh danh khi xe dừng trước cửa hàng gọi trả bài + Thẻ Đặc Quyền
│       ├── LeaderboardModal.tsx# Bảng xếp hạng cửa hàng thịnh vượng nhất
│       └── EcosystemModal.tsx  # Giao diện giả lập Cổng Hệ Sinh Thái (test đồng bộ điểm giữa các trò chơi)
└── App.tsx                     # Đóng gói <ClassCityModule /> sẵn sàng nhúng hoặc chạy độc lập
```

---

## 7. QUY TRÌNH THỰC THI DÀNH CHO ANTIGRAVITY
1. Khởi tạo dự án và cài đặt đầy đủ các gói thư viện đã nêu ở Mục 1.
2. Xây dựng hoàn chỉnh các file theo đúng cấu trúc thư mục ở Mục 6, đảm bảo không có lỗi TypeScript hay thiếu import.
3. Chạy ứng dụng trên máy chủ phát triển (`npm run dev`), tự động mở trình duyệt kiểm tra:
   * Đảm bảo thành phố 3D hiển thị đầy đủ 36 cửa hàng rực rỡ sắc màu (có biểu tượng ngành hàng riêng), có nhân vật đi lại trước cửa, có xe ô tô chạy trên đường và hộp quà bí ẩn.
   * Kiểm tra thao tác bấm nút **"Auto Lái Gọi Tên"**, xe phải di chuyển mượt mà quanh đường, dừng trước một nhà, camera zoom vào đúng mặt tiền không bị khuất, phát âm thanh và hiện bảng gọi tên học sinh.
   * Kiểm tra thao tác cộng điểm lên cấp (trực tiếp hoặc đồng bộ từ Cổng Hệ Sinh Thái), ngôi nhà 3D phải thay đổi hình dáng cao lớn hơn và có pháo hoa chúc mừng.