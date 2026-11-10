# Đặc tả Thiết kế 3D: Nhà / Cửa hàng 20 Cấp độ — ClassCity 3D

> **Mục đích tài liệu:** Cung cấp bản đặc tả mỹ thuật & kỹ thuật chi tiết để bạn (hoặc các công cụ AI tạo mô hình 3D như **Meshy**, **Tripo3D**, **Hyper3D Rodin**, hoặc **AI viết script Blender Python**) tạo bộ 20 mô hình `.glb` chất lượng cao cho các cửa hàng từ **Cấp 1 đến Cấp 20**, thả vào dự án là chạy khớp ngay với thành phố, khuôn viên riêng, camera tự động và biểu tượng ngành hàng (`ShopToppers`).

---

## 1. Quy chuẩn Kỹ thuật Bắt buộc (Để thả vào ClassCity là chạy ngay)

Mọi thông số dưới đây khớp trực tiếp với mã nguồn [`ShopModel.tsx`](../src/games/classcity/components/canvas/ShopModel.tsx), [`assetService.ts`](../src/platform/assets/assetService.ts), [`cityLayout.ts`](../src/games/classcity/config/cityLayout.ts) và [`LotDecor.tsx`](../src/games/classcity/components/canvas/LotDecor.tsx).

### 1.1 Tên file & Thư mục lưu
- Thư mục đặt file: **`public/games/classcity/models/`**
- Quy ước tên file chính xác (viết thường, **không** thêm số `0` đằng trước):
  - `shop_level_1.glb`, `shop_level_2.glb`, ..., `shop_level_9.glb`, `shop_level_10.glb`, ..., `shop_level_20.glb`
  - *(Lưu ý: `AssetService` tự động tải đúng đường dẫn `/games/classcity/models/shop_level_${level}.glb`. Chỉ cần file xuất hiện ở đây, game sẽ tự ưu tiên dùng mô hình `.glb` thay cho khối dựng thủ tục).*

### 1.2 Hệ trục, Tâm gốc & Kích thước Vàng (Khớp khuôn viên riêng)
| Thuộc tính | Quy chuẩn bắt buộc | Lý do kỹ thuật trong ClassCity |
|---|---|---|
| **Hệ trục (Axis)** | **`Y-up`** (trục `+Y` hướng lên trời), đơn vị **1 unit = 1 mét** | Chuẩn glTF 2.0 / Three.js |
| **Hướng mặt tiền** | Quay thẳng về trục **`+Z`** | Khớp góc quay `rotationY = 0`, lối đi lát đá và `cameraFocus` ở phía `+Z` |
| **Điểm gốc (Origin)** | `(0, 0, 0)` nằm tại **tâm đáy bệ móng** của ngôi nhà | Thảm sân khuôn viên cao `y = 0.08`, bệ nhà đặt tại `y = 0` đến `0.28` để không chìm hoặc bay |
| **Chiều rộng tối đa (`X`)** | **`3.2 – 4.4` units** (tuyệt đối **`<= 4.5`**) | Hai bên sân chừa chỗ cho cây (`x = -2.68`), thú cưng (`x = 1.52`), biển hiệu (`x = 2.52`) và tường bao (`x = ±3.32`) |
| **Chiều sâu tối đa (`Z`)** | **`3.0 – 4.2` units** (tuyệt đối **`<= 4.3`**) | Phía trước chừa đường ra cổng (`z = 2.95`), phía sau cách tường hậu (`z = -3.05`) |
| **Chiều cao (`Y`)** | Tăng dần từ **`2.4` (Cấp 1)** đến **`12.5` (Cấp 20)** (tuyệt đối **`<= 13.0` chưa tính Topper**) | Cộng thêm `ShopToppers` (~1.0–1.2u) vẫn đảm bảo `<= 14.0` (`MAX_BUILDING_HEIGHT`), camera gọi tên không bao giờ bị che |
| **Không chứa nền cỏ / hàng rào** | **Chỉ xuất phần kiến trúc tòa nhà** (có bậc thềm cửa hẹp `<= 0.4u` ở `+Z`) | Nền cỏ, tường bao, cây cối, thú cưng, biển hiệu đã được render riêng bởi hệ thống Item khuôn viên `LotDecor` |

### 1.3 Điểm neo Biểu tượng Ngành hàng (`Anchor_Topper`)
- Trong scene `.glb`, tạo **1 nút rỗng (`Empty / Object3D`)** đặt tên chính xác là: **`Anchor_Topper`**.
- Vị trí của `Anchor_Topper`: đặt nằm chính giữa đỉnh mái (`x = 0, z = 0`, `y = đỉnh cao nhất của mái bằng / bệ đặt trên chóp`), nơi có một **bệ tròn hoặc mặt phẳng nhỏ đường kính ~`1.1u`** để hệ thống tự động gắn biểu tượng ngành hàng (*Bánh kem, Cốc cà phê, Quyển sách, Đầu mèo, Tay cầm game*) lên trên.

### 1.4 Ngân sách Hiệu năng (40 Nhà × 60 FPS)
- **Triangles:**
  - Cấp 1–4: **`800 – 1,800` triangles**
  - Cấp 5–9: **`1,500 – 2,600` triangles**
  - Cấp 10–14: **`2,200 – 3,500` triangles**
  - Cấp 15–19: **`3,000 – 4,500` triangles**
  - Cấp 20: **`4,000 – 5,800` triangles**
- **Materials & Textures:** Khuyến nghị **1–3 Material PBR** (`Principled BSDF`, `roughness ~ 0.45–0.85`). Nếu dùng texture, gộp vào **1 Texture Atlas `512×512` hoặc `1024×1024`** (hoặc dùng **Vertex Colors / Color Palette nhỏ `64×64`** để tổng dung lượng mỗi `.glb` giữ ở mức **`150 KB – 700 KB`**).
- **Nén:** Export glTF Binary (`.glb`). Khuyến nghị tối ưu hình học bằng **Meshopt** (không cần file giải mã ngoài) hoặc **Draco** *(nếu nén Draco phải đặt decoder vào `public/draco/`)*.

---

## 2. Tư duy Mỹ thuật (Art Direction) cho ClassCity giữa Đảo Bay Vũ Trụ

Thành phố ClassCity hiện nằm trên **một hòn đảo xanh có thác nước trôi giữa bầu trời đêm vũ trụ đầy sao và tinh vân tím-xanh**. Vì vậy, thiết kế 20 cấp nhà phải tuân thủ 4 nguyên tắc thị giác sau để nổi bật rực rỡ:

1. **Phong cách "Cozy Stylized Diorama" (Đồ chơi Kiến trúc Chibi Cao cấp):**
   - Tỷ lệ hơi mũm mĩm đáng yêu (*chunky proportions*): khung cửa sổ dày dặn, mái ngói bo cạnh mềm (*subtle bevel*), cột trụ vững chãi — tránh tường mỏng dính sắc nhọn kiểu hiện thực khô khan.
   - Độ vát nhẹ ở các cạnh (`Bevel 0.03–0.05`) giúp bắt ánh sáng mặt trời và ánh trăng cực đẹp, không bị cảm giác hộp vuông nhựa trơn.
2. **Chi tiết Đèn Ấm Tỏa Sáng Ban Đêm (`Emissive Warmth`):**
   - Trong không gian vũ trụ nền tối (`#070B24`), các ô cửa sổ kính và đèn lồng mặt tiền **nên có một chút phát sáng vàng mật ong (`#FDE68A`, `emissiveStrength ~ 0.35–0.65`)** đan xen kính xanh phản quang. Ban đêm nhìn cả khu phố 36 nhà giống như những chiếc đèn lồng cổ tích lấp lánh trên hòn đảo bay!
3. **Thẩm mỹ 360° (Đẹp cả từ mặt hông & mặt sau):**
   - Camera của người chơi tự xoay và kéo 360°. Do đó **2 mặt hông (`±X`) và mặt sau (`-Z`)** bắt buộc phải có phào chỉ tầng, cửa sổ phụ, ống khói, dây leo tường hoặc chi tiết đường ống/ban công sau — tuyệt đối tránh trường hợp AI chỉ dựng đẹp mỗi mặt trước rồi để 3 mặt kia phẳng lì.
4. **Phân cấp Cảm xúc Tiến hóa ("Nhìn là thấy sướng mắt muốn lên cấp"):**
   - Học sinh nhìn từ xa hay nhìn gần đều thấy sự nâng cấp rõ rệt cả về **chiều cao**, **độ hoành tráng của mái**, **chất liệu** *(gỗ thô mộc → gạch ngói → đá trắng & sắt uốn → kính vòm & đồng vàng → pha lê & vàng ròng)* và **cấu trúc phụ** *(từ không tầng → gác mái → ban công → sảnh đôi → tháp đôi/tiền sảnh hoàng gia)*.

---

## 3. Đặc tả Chi tiết 20 Cấp độ Kiến trúc (5 Kỷ nguyên Tiến hóa)

> **Lưu ý phối màu tường chính:** Khuyến nghị giữ một lớp vật liệu tường chính (`Wall_Primary` có màu pastel sáng dịu như Kem bơ `#FEF3C7`, Ngọc bạc hà `#CCFBF1`, Hồng đào `#FCE7F3`, Xanh thiên thanh `#DBEAFE` hoặc Tím oải hương `#EDE9FE`) phối với **Khung viền Trắng ngà `#FFFDF7`**, **Gỗ sồi ấm `#B45309`** và **Mái ngói sắc nét** (Đỏ san hô, Xanh ngọc cổ vịt, Vàng đồng, Xanh cô-ban) để cả khu phố đa dạng mà vẫn ăn rơ!

---

### Kỷ nguyên 1: Khởi nghiệp Sân vườn — Những Gian hàng Ấm áp (Cấp 1 → 4)
*Cảm giác chủ đạo: Gần gũi, mộc mạc, thủ công dễ thương (Tỷ lệ ngang ~ `3.2–3.8u`, cao `2.4–3.6u`).*

#### Cấp 1 (`shop_level_1.glb`) — *Xe Kéo / Sạp Gỗ Khởi Nghiệp*
- **Kích thước:** `3.2 × 2.5 × 2.8` (cao mái `~2.4`, `Anchor_Topper` ở `y = 2.45`).
- **Hình khối & Chi tiết:** Một quầy ki-ốt gỗ nhỏ nhắn dựng trên 2 bánh xe gỗ trang trí cách điệu bên hông (hoặc 4 chân cột trụ ngắn đặt trên sàn gỗ thấp). Mặt tiền mở quầy bán hàng nửa thân dưới bằng ván gỗ ghép dọc, mặt quầy trưng bày nhỏ nhô ra ở phía trước (`+Z`). Hai cột gỗ trước đỡ **mái hiên vải bạt sọc nghiêng 25°**.
- **Mặt hông & sau:** Mặt sau đóng ván gỗ có cửa chớp thông gió và 1 chiếc thùng gỗ nhỏ xếp sát chân tường; bên hông treo một chiếc đèn bão nhỏ phát sáng vàng ấm.
- **Chất liệu:** Gỗ thông sáng, vải bạt sọc pastel kem-cam, nền sàn đá xám mỏng.

#### Cấp 2 (`shop_level_2.glb`) — *Quầy Tiệm Mái Lá / Ngói Đỏ*
- **Kích thước:** `3.4 × 2.9 × 3.0` (`Anchor_Topper` ở `y = 2.85`).
- **Hình khối & Chi tiết:** Đã kín 4 vách vững chãi trên bệ đá thấp. Mái nhà chữ A hai dốc đối xứng có tấm ngói xếp bậc rõ khối, chính giữa đỉnh mái có bệ phẳng nhỏ đặt `Anchor_Topper`. Mặt tiền có 1 cửa gỗ vòm nhỏ hơi lệch sang trái, bên phải là **khung cửa sổ bán hàng rộng** có mái che bạt sọc nhỏ + kệ gỗ đặt vài chậu hoa mini.
- **Chi tiết nổi bật:** Ống khói gạch nhỏ vươn lên ở góc sau trái của mái nhà, cột gỗ 4 góc.

#### Cấp 3 (`shop_level_3.glb`) — *Tiệm Phố Cổ Xinh Xắn (Có Gác Xép Áp Mái)*
- **Kích thước:** `3.6 × 3.3 × 3.2` (`Anchor_Topper` ở `y = 3.25`).
- **Hình khối & Chi tiết:** Vách tường trát vữa pastel kết hợp phần **chân tường ốp gạch thô** (`wai-high stone wainscoting` cao 0.8u chạy quanh cả 4 mặt!). Cửa chính chuyển về chính giữa đối xứng, có bậc tam cấp đá 2 tầng và tay nắm đồng; hai bên cửa là 2 ô cửa sổ vuông có khung gỗ và bậu cửa gắn hoa. Trên mái ngói dốc phía trước nhô ra **1 cửa sổ áp mái tròn / tam giác (dormer window)** sáng đèn vàng ấm.
- **Mặt hông:** Có 1 giàn gỗ nhỏ leo dây xanh nhẹ trên vách tường.

#### Cấp 4 (`shop_level_4.glb`) — *Cửa hàng Góc Phố Đầu Tiên (Mái Nhô Đón Khách)*
- **Kích thước:** `3.8 × 3.7 × 3.4` (`Anchor_Topper` ở `y = 3.65`).
- **Hình khối & Chi tiết:** Khối nhà vững vàng nhất Kỷ nguyên 1. Thêm **mái hiên vòm/dốc rộng vươn hẳn ra phía trước** (`0.7u`) được chống bằng 2 cột gỗ tròn xinh xắn tạo thành hàng hiên nhỏ trước cửa. Trên mái chính thiết kế thêm một **tầng tum nhỏ có lan can gỗ lửng** tạo bệ trang trọng nâng `Anchor_Topper`. Cửa sổ mặt tiền nâng cấp thành **cửa kính chia 4 ô** sáng ánh đèn mật ong; hai mặt hông mỗi bên có 1 cửa sổ tròn bo viền kem.

---

### Kỷ nguyên 2: Phố Xá Sôi Động — Tiệm 1 Tầng Kiên cố (Cấp 5 → 9)
*Cảm giác chủ đạo: Chuyên nghiệp, khang trang, bắt đầu có mặt tiền thương hiệu & ánh sáng rực rỡ (Ngang `3.9–4.2u`, cao `3.9–5.5u`).*

#### Cấp 5 (`shop_level_5.glb`) — *Tiệm Tường Gạch Mái Mansard*
- **Kích thước:** `3.9 × 4.0 × 3.5` (`Anchor_Topper` ở `y = 3.95`).
- **Hình khối & Chi tiết:** Đổi hẳn phom dáng từ ki-ốt lên **tòa nhà 1 tầng trần cao** kiểu tiệm bánh Châu Âu. Bốn góc tường có **trụ bổ tường ốp đá kem nổi**. Mái nhà chuyển sang dạng **mái Mansard 4 mặt vát thang** có gờ viền chạy quanh, đỉnh mái bằng đặt `Anchor_Topper`. Mặt tiền có cửa chính hai cánh lớn bằng kính khung gỗ ở giữa và 2 cửa kính trưng bày cao sát bệ chân tường, trên cửa có thanh biển hiệu gỗ trơn.

#### Cấp 6 (`shop_level_6.glb`) — *Cửa hàng Mặt tiền Kính Rộng (Showroom Mini)*
- **Kích thước:** `4.0 × 4.3 × 3.6` (`Anchor_Topper` ở `y = 4.25`).
- **Hình khối & Chi tiết:** Mặt tiền nổi bật với **2 khung cửa kính lồi kiểu Bay Window** đối xứng hai bên cửa chính (bệ bên dưới ốp gạch họa tiết, kính trong ánh sáng vàng ấm). Trên bệ mái hiên phẳng ngang gắn **2 đèn tường kiểu cổ điển** chiếu sáng xuống bậc thềm. Mái Mansard được chia 2 bậc nhẹ với 2 ô cửa sổ mái nhỏ mặt trước. Hai bên hông có cột trụ chia khoang tường và 2 ô cửa sổ hẹp có mái che nhỏ.

#### Cấp 7 (`shop_level_7.glb`) — *Tiệm Phố Có Sân Thượng (Rooftop Terrace)*
- **Kích thước:** `4.0 × 4.7 × 3.7` (`Anchor_Topper` ở `y = 4.65`).
- **Hình khối & Chi tiết:** Thêm một khoảng **tầng lửng mái bằng (Mezzanine)** hơi thu hẹp diện tích so với tầng trệt, xung quanh mép tầng trệt có **hàng lan can con tiện trắng**. Tầng lửng trên mái có tường kính tròn hoặc bát giác nhỏ (bệ giữ `Anchor_Topper`) giúp tòa nhà trông cao ráo hẳn lên so với Cấp 6. Mặt tiền tầng trệt có mái hiên vải dập nổi gợn sóng thanh lịch.

#### Cấp 8 (`shop_level_8.glb`) — *Cửa hiệu Tháp Đồng hồ Phố*
- **Kích thước:** `4.1 × 5.1 × 3.8` (`Anchor_Topper` ở `y = 5.05`).
- **Hình khối & Chi tiết:** Tầng trệt uy nghi với **cổng vòm bán nguyệt bằng đá sáng** ôm trọn cửa chính hai cánh và ô kính vòm trên cửa. Phía trên mái hiên nhô ra một **trán tường hình bán nguyệt/tam giác có gắn mặt đồng hồ cổ điển trang trí** hướng thẳng về phía trước (`+Z`). Phía sau đồng hồ là mái chóp thang 4 cạnh vươn cao lên đỡ bệ `Anchor_Topper`. Mặt hông bổ sung ống thông hơi đồng và cửa hậu trang nhã.

#### Cấp 9 (`shop_level_9.glb`) — *Nhà Phố Lớn Hai Cửa Vòm (Chuẩn bị Lên Lầu)*
- **Kích thước:** `4.2 × 5.5 × 3.9` (`Anchor_Topper` ở `y = 5.45`).
- **Hình khối & Chi tiết:** Cấp cao nhất của mô hình 1 tầng: chiều cao trần cực thoáng với **3 nhịp vòm mặt tiền** (vòm giữa cao nhất làm cửa vào, hai vòm hai bên làm cửa sổ lớn có bồn hoa treo). Trên mái có **nhà chòi mái vòm mini (cupola)** dựng trên 4 cột vuông đỡ phần nóc tròn có rãnh múi gân (`ribbed dome`) rất tinh tế cho `Anchor_Topper`. Có cầu thang phụ giả nhỏ hoặc đèn trang trí ở 4 góc mái.

---

### Kỷ nguyên 3: Dinh thự Phố — Tòa nhà 2 Tầng Thịnh vượng (Cấp 10 → 14)
*Cảm giác chủ đạo: Đô thị phồn hoa, có lầu cao, ban công rộng, lan can sắt/gỗ uốn và phào chỉ tầng rõ ràng (Ngang `4.2–4.4u`, cao `5.9–8.1u`).*

#### Cấp 10 (`shop_level_10.glb`) — *Nhà Phố 2 Tầng Ban công Góc Cổ điển*
- **Kích thước:** `4.2 × 6.0 × 4.0` (`Anchor_Topper` ở `y = 5.95`).
- **Hình khối & Chi tiết:** Tòa nhà 2 tầng chuẩn mực phân tách rõ bởi **dải phào chỉ đá chạy quanh 4 mặt**. Tầng 1 mang phong cách cửa hàng kính + mái hiên; Tầng 2 mở ra **ban công nhô hẳn về phía trước (`+Z`)** có lan can con tiện và cửa đi đôi mở ra ban công ở giữa. Hai bên ban công là 2 cửa sổ có chớp gỗ hai cánh mở ra hai bên. Mái ngói nghiêng cổ điển có chóp bằng phía trên đặt `Anchor_Topper`.

#### Cấp 11 (`shop_level_11.glb`) — *Biệt thự Thương mại Tầng 2 Vòm Kính*
- **Kích thước:** `4.3 × 6.5 × 4.0` (`Anchor_Topper` ở `y = 6.45`).
- **Hình khối & Chi tiết:** Ban công Tầng 2 mở rộng sang **ôm cả 2 góc trước** (`wrap-around corner balcony`), bên dưới được nâng đỡ bằng các **con sơn (corbel) uốn cong gắn tường**. Tầng 2 có 3 cửa sổ vòm cao ráo sáng đèn vàng ấm; mặt hông có mỗi tầng 2 cửa sổ đồng đều. Mái nhà dạng **mái Mansard dốc sâu** có gờ trang trí mạ vàng nhẹ và bệ đứng trên đỉnh.

#### Cấp 12 (`shop_level_12.glb`) — *Tòa nhà Boutique Phong cách Paris (Cột Nổi Mặt tiền)*
- **Kích thước:** `4.3 × 7.0 × 4.0` (`Anchor_Topper` ở `y = 6.95`).
- **Hình khối & Chi tiết:** Mặt tiền nhấn mạnh tính thẳng đứng bằng **4 cột trụ cao chạy suốt 2 tầng** (kết thúc bằng đầu cột trang trí ở tầng mái). Tầng 1 có sảnh vào giật sâu vào trong tạo chiều sâu bóng đổ, hai bên đặt 2 chậu cây đá liền bậc thềm. Tầng 2 có ban công sắt/thép tối màu họa tiết nhẹ và **biển hiệu ngang khắc khung viền đồng** giữa tầng 1 và tầng 2.

#### Cấp 13 (`shop_level_13.glb`) — *Nhà 2 Tầng Có Tháp Chuông / Tháp Góc*
- **Kích thước:** `4.3 × 7.6 × 4.1` (`Anchor_Topper` ở `y = 7.55`).
- **Hình khối & Chi tiết:** Kiến trúc bất đối xứng cực kỳ bắt mắt: thân chính 2 tầng sang trọng bên trái, kết hợp với **1 tháp vuông nhô cao hơn ở góc phải mặt trước (hoặc trung tâm nâng cao)** vươn lên thêm 1 phần tầng mái chóp nhọn! Cửa sổ tầng 2 thiết kế dạng **cửa kính vòm cao 2 cánh**; mái chính bên trái lợp ngói vảy cá màu đồng bộ; đỉnh khối cao nhất đặt bệ phẳng cho `Anchor_Topper`.

#### Cấp 14 (`shop_level_14.glb`) — *Dinh thự Cổ tích Hai Mái Vòm*
- **Kích thước:** `4.3 × 8.1 × 4.1` (`Anchor_Topper` ở `y = 8.05`).
- **Hình khối & Chi tiết:** Đỉnh cao của nhà 2 tầng. Tiền sảnh tầng 1 mở rộng thành **hiên vòm 3 cửa có 4 trụ cột trắng tròn**. Tầng 2 lùi nhẹ vào trong một bước để chừa hàng lan can sân thượng có bồn hoa chạy dài cả mặt trước lẫn 2 bên hông. Trên mái bố trí một khối tầng áp mái giật cấp có **hai mái chóp phụ đối xứng 2 bên** và **vòm trung tâm** trang trí viền vàng nâng `Anchor_Topper`.

---

### Kỷ nguyên 4: Boutique Hiện đại — Tòa Tháp 3 Tầng Kiêu sa (Cấp 15 → 19)
*Cảm giác chủ đạo: Biểu tượng đẳng cấp khu phố, kiến trúc giật cấp tầng bậc (step-back), kính cường lực lớn, mái vòm & tháp đèn lồng lung linh (Ngang `4.3–4.4u`, cao `8.6–11.4u`).*

#### Cấp 15 (`shop_level_15.glb`) — *Tòa nhà 3 Tầng Mái Vòm Đá Kem*
- **Kích thước:** `4.3 × 8.8 × 4.1` (`Anchor_Topper` ở `y = 8.75`).
- **Hình khối & Chi tiết:** Tòa nhà 3 tầng thực thụ! Tầng 1 là sảnh thương mại mặt kính cao; Tầng 2 có ban công chạy ngang mặt tiền; Tầng 3 có bộ 3 cửa sổ vòm hẹp sang trọng hơn. Phía trên tầng 3 là **tầng đế giật cấp đỡ một mái vòm tròn thanh lịch chia múi** màu ngọc/xanh/đồng có đỉnh phẳng vừa khít cho `Anchor_Topper`. Mặt hông đầy đủ cửa sổ 3 tầng kèm phào phân tầng rõ nét.

#### Cấp 16 (`shop_level_16.glb`) — *Tòa Boutique Kính Vòm Art-Deco*
- **Kích thước:** `4.3 × 9.4 × 4.1` (`Anchor_Topper` ở `y = 9.35`).
- **Hình khối & Chi tiết:** Hơi thở Art-Deco pha lẫn cổ tích: các góc tường vát cạnh mềm (*chamfered corners*) chạy dọc 3 tầng. Mặt tiền tầng 1–2 liên kết thành **một khung vòm kính thông tầng khổng lồ ở giữa** viền đồng vàng, tạo hiệu ứng phát sáng lung linh khi nhìn từ xa! Tầng 3 thu hẹp nhẹ hai bên thành **sân hiên nhỏ trên cao có giàn pergola khung mảnh**.

#### Cấp 17 (`shop_level_17.glb`) — *Tổ hợp Thương mại Giật cấp Hai Cánh*
- **Kích thước:** `4.4 × 10.1 × 4.1` (`Anchor_Topper` ở `y = 10.05`).
- **Hình khối & Chi tiết:** Hình khối **tòa tháp bậc thang 3 nhịp rõ rệt**: Khối đế 2 tầng vững chãi bề thế (`4.4 × 4.1`), khối tầng 3 thu hẹp lại một chút (`3.6 × 3.4`) để lộ ra 4 góc sân hiên có **đèn lồng trụ phát sáng**, và khối nóc thu gọn tiếp với mái vòm bát giác cao vút đặt `Anchor_Topper`. Mặt tiền có mái hiên kính khung kim loại tinh tế vươn trên cửa chính.

#### Cấp 18 (`shop_level_18.glb`) — *Tòa Tháp Đèn lồng & Cầu thang Gác*
- **Kích thước:** `4.4 × 10.7 × 4.2` (`Anchor_Topper` ở `y = 10.65`).
- **Hình khối & Chi tiết:** Tiền sảnh tầng 1 nâng lên bệ tam cấp rộng có **hai tượng/chậu trụ đèn đứng gác cổng**. Tầng 2 & 3 có **ô kính góc bao quanh (corner wrap-around windows)** sáng ánh vàng ấm. Ở tầng mái có một **vọng lâu kính (glass lantern rotunda)** 8 mặt có 8 cột mảnh chống **mái vòm uốn cong kiểu Baroque**, đỉnh vòm đặt `Anchor_Topper`.

#### Cấp 19 (`shop_level_19.glb`) — *Tiền Cung điện Thương mại (Chuẩn bị Lên Đỉnh)*
- **Kích thước:** `4.4 × 11.4 × 4.2` (`Anchor_Topper` ở `y = 11.35`).
- **Hình khối & Chi tiết:** Cận kề đỉnh vinh quang! Toàn bộ 3 tầng sở hữu kiến trúc lộng lẫy: **sảnh cột đôi (double columns)** phía trước cửa chính, hai tầng trên mỗi tầng đều có ban công lan can vàng nhạt thanh lịch và cửa sổ kính vòm viền kem. Tầng áp mái có 4 chóp nhỏ ở 4 góc bảo vệ một **mái vòm cao quý** ở trung tâm có vòng lan can quan sát nhỏ quanh chân `Anchor_Topper`.

---

### Kỷ nguyên 5: Đỉnh cao Kỳ quan — Siêu Tháp 4 Tầng (Cấp 20)
*Cảm giác chủ đạo: Độc tôn, lộng lẫy nhất thành phố, dễ nhận biết ngay lập tức từ góc nhìn toàn cảnh lẫn vũ trụ (Ngang `4.4u`, cao `12.6u` chưa tính Topper).*

#### Cấp 20 (`shop_level_20.glb`) — *Siêu Tháp Thương Mại Hoàng Gia (Grand Skylight Tower)*
- **Kích thước chuẩn:** `4.4 × 12.6 × 4.2` (Bệ phẳng `Anchor_Topper` đặt tại **`y = 12.6`**, cộng thêm `ShopToppers` cao ~`1.1u` vẫn nằm gọn trong trần `14.0`!).
- **Hình khối & Chi tiết xuất sắc:**
  1. **Tầng 1 (Đại sảnh Vương miện):** Sảnh đón khách hoành tráng có **4 trụ cột trắng đầu cột dát vàng** đỡ trán sảnh chạm nổi vòm cung, bậc tam cấp đá cẩm thạch rộng bậc thềm, cửa đại sảnh gỗ sẫm kết hợp kính hoa văn sáng rực.
  2. **Tầng 2 & 3 (Thân Tháp Tráng lệ):** Hai tầng giữa dựng khối vuông vắn khỏe khoắn nhưng vát bo nhẹ 4 góc; mặt tiền & 2 mặt hông có hệ thống **cửa sổ vòm cao hai tầng liên hoàn**, dải phào vàng kim chạy quanh giữa tầng 2 và 3 tạo dải đai quý tộc; ban công Tầng 2 có vương miện nhỏ trang trí giữa lan can.
  3. **Tầng 4 (Tầng Đế Giật Cấp & 4 Tháp Góc):** Tầng 4 thu hẹp diện tích còn `~3.2 × 3.2` tạo **sân thượng bao quanh cả 4 phía**, ở 4 góc sân thượng dựng **4 tháp đèn mini chóp nhọn mạ vàng** (cao tầm `1.4u`) sáng lấp lánh như 4 ngọn hải đăng.
  4. **Đỉnh Tháp (Vương miện & Vòm Pha lê):** Trên nóc Tầng 4 là **một mái vòm ngọc lam-vàng lộng lẫy kiểu cung điện**, bao quanh chân vòm bởi vòng hào quang/vương miện răng cưa bằng vàng đồng (`golden crown cornice`), chính đỉnh vòm có bệ đài sen nhỏ phẳng đánh dấu **`Anchor_Topper`** để đội vương miện biểu tượng ngành hàng lên đỉnh cao nhất!

---

## 4. Bộ Prompt Tiếng Anh Copy-Paste Sẵn cho AI Tạo Mô hình 3D (Meshy / Tripo3D / Rodin / Blender)

Khi dùng các nền tảng AI 3D Text-to-3D, hãy ghép **Style Prefix + Mô tả cấp độ + Negative Constraints** bên dưới.

### 4.1 Style Prefix Dùng Chung (Luôn dán ở đầu prompt)
```text
Cozy stylized low-poly 3D boutique building for a classroom diorama game, isolated single standalone shop asset centered at world origin, Y-up, front entrance strictly facing +Z, subtle beveled chunky geometry, warm glowing golden windows, pastel stucco walls with cream trim and warm oak wood accents, crisp clean hand-painted stylized PBR materials, detailed architecture on all four sides (front, left, right, back), flat small circular pedestal pad on top roof apex for mounting a mascot emblem. No ground terrain, no grass patch, no surrounding fences, no extra trees or characters.
```

### 4.2 Negative Prompt (Dán vào ô Negative nếu công cụ hỗ trợ)
```text
grass base, terrain slab, dirt island, surrounding fence, stray trees, floating fragments, realistic gritty textures, high poly noise, crumbling ruins, dark monochrome, characters, people, cars, flat blank back wall
```

### 4.3 Prompt Mẫu Đại diện cho 5 Kỷ nguyên (Bạn chỉ cần thay số tầng/tên biến thể)

- **Kỷ nguyên 1 (VD Cấp 1 – Quầy khởi nghiệp):**
  > `[Style Prefix] + Tier 1 starter wooden market stall kiosk, cozy hand-crafted timber counter at bottom front, colorful striped fabric awning canopy leaning forward, warm hanging lantern on the side, small crates stacked neatly at the back wall, compact square proportions width 3.4 depth 3.0 height 2.5.`

- **Kỷ nguyên 1 (VD Cấp 4 – Ki-ốt có hiên cột & tum mái):**
  > `[Style Prefix] + Tier 1 upgraded cozy corner shop, pastel painted walls with stone lower wainscoting, welcoming wide front porch roof supported by two round wooden columns, pitched ceramic tile roof with a cute illuminated circular dormer window and small flat roof turret platform at center top, width 3.8 depth 3.4 height 3.6.`

- **Kỷ nguyên 2 (VD Cấp 6–9 – Tiệm phố 1 tầng & Mái vòm nhỏ):**
  > `[Style Prefix] + Tier 2 prosperous single-story town shop, tall ground floor with dual glowing bay display windows, arched stone main entrance with twin wood-and-glass doors, decorative clock gable above porch, sloped four-sided mansard roof topped with a miniature hexagonal lantern cupola pedestal, corner stone pilasters, width 4.1 depth 3.8 height 4.8.`

- **Kỷ nguyên 3 (VD Cấp 10–14 – Tòa nhà 2 tầng có ban công):**
  > `[Style Prefix] + Tier 3 grand two-story townhouse shop, ground floor storefront with wide awning and display windows, wrap-around upper balcony supported by sculpted corbels with cream balustrade, three arched warmly lit windows on second floor, classic decorative floor belt molding on all four walls, steep mansard roof with small roof dormers and central flat pedestal cupola, width 4.3 depth 4.0 height 7.2.`

- **Kỷ nguyên 4 (VD Cấp 15–19 – Tòa nhà 3 tầng Boutique):**
  > `[Style Prefix] + Tier 4 upscale three-story boutique building, subtle Art-Deco chamfered corners, grand double-height central arched glass atrium on front facade, upper floor balcony terraces on third story with corner ornamental pillars, stepped upper roof base crowned by a ribbed turquoise-and-gold dome with flat apex pedestal, warm golden lit windows wrapping side walls, width 4.3 depth 4.1 height 10.2.`

- **Kỷ nguyên 5 (Cấp 20 – Siêu Tháp Hoàng Gia):**
  > `[Style Prefix] + Tier 5 majestic four-story grand commercial palace tower, marble front staircase and four grand cream columns supporting ornate entrance portico, richly detailed three lower floors with gilded belt cornices and luminous arched tall windows on all sides, setback fourth-floor rooftop terrace featuring four miniature golden corner spire turrets surrounding a magnificent royal ribbed dome crowned with a golden ring cornice and central flat pedestal at the top, width 4.4 depth 4.2 height 12.6.`

> **Mẹo để gen ra 20 cấp khác nhau rõ rệt:** Khi chạy cho từng cấp cụ thể (ví dụ Cấp 11 vs Cấp 12 vs Cấp 13), chỉ cần chèn mô tả đặc trưng riêng ở **Mục 3** vào giữa prompt tương ứng của kỷ nguyên đó!

---

## 5. Quy trình Chuẩn hóa file `.glb` trong Blender Trước khi Đưa vào Game

Các file do AI gen ra thường bị lệch tâm, quá nặng (30k–100k tris) hoặc dính nền cỏ. Trước khi lưu vào `public/games/classcity/models/shop_level_N.glb`, hãy xử lý nhanh trong **Blender** (mất ~2 phút/mẫu):

1. **Dọn rác & Nền:** Xóa hết nền đất/cỏ/đá dưới chân nếu AI vô tình sinh kèm (vì game đã có thảm khuôn viên `LotDecor`).
2. **Xoay đúng hướng `+Z`:** Nhìn từ trục `-Y` (chế độ Front NumPad 1 trong Blender, chú ý trong Blender trục `-Y` tương đương `+Z` khi xuất glTF!). Chắc chắn rằng trong bảng Export glTF 2.0 đã bật **`+Y Up`** (mặc định của Blender) và mặt tiền cửa hàng quay về phía **`-Y` trong Blender** (khi xuất glTF sẽ tự đổi thành **`+Z`** chuẩn xác!).
   - *Kiểm tra nhanh:* Mở file `.glb` vừa xuất bằng https://gltf-viewer.donmccurdy.com/ — bấm nhìn từ chính diện hướng camera mặc định nhìn vào gốc `(0,0,0)` thấy thẳng mặt cửa chính là chuẩn!
3. **Đặt gốc `(0, 0, 0)` & Áp dụng tỷ lệ (`Scale`):**
   - Đặt phần đáy thấp nhất của tòa nhà chạm đúng mặt phẳng `Z = 0` trong Blender (tức `Y = 0` trong glTF), tâm `X = 0, Y = 0`.
   - Đưa kích thước Bounding Box về chuẩn Mục 3 (ngang `3.2–4.4m`, sâu `2.8–4.2m`, cao tương ứng cấp `2.4–12.6m`).
   - Chọn toàn bộ mesh → nhấn **`Ctrl + A` → All Transforms** (bắt buộc để `scale` không bị biến dạng trong `ShopModel.tsx`).
4. **Giảm lưới nếu quá nặng:**
   - Nếu AI sinh `> 10,000` triangles, thêm Modifier **Decimate** (`Planar` hoặc `Collapse ~0.2–0.3`) để đưa về `1,000–4,500` triangles mà vẫn giữ sắc cạnh kiến trúc.
5. **Gắn điểm neo `Anchor_Topper`:**
   - `Shift + A` → **Empty → Plain Axes** → Đổi tên đúng chính xác thành **`Anchor_Topper`**.
   - Kéo `Anchor_Topper` đặt lên tâm bệ đỉnh mái (nơi gắn bánh kem / cốc cà phê / sách / tay cầm game).
6. **Xuất `.glb` tối ưu:**
   - `File → Export → glTF 2.0 (.glb)`.
   - Format: `glTF Binary (.glb)`, bật `Apply Modifiers`, `Y Up`, **Mesh Compression: tắt** *(hoặc nếu bật Draco compression thì nhớ copy bộ giải mã Draco vào `public/draco/`)*.
   - Nếu muốn nén nhẹ bằng **Meshopt** không cần file phụ: chạy `npm.cmd exec --yes -- @gltf-transform/cli optimize shop_level_1.glb shop_level_1_opt.glb --compress meshopt` rồi chép vào `public/games/classcity/models/shop_level_1.glb`.

---

## 6. Bộ Ảnh Concept Tham chiếu Sẵn sàng cho Image-to-3D

Các ảnh concept độ phân giải `1024×1024` (nền trơn, góc 3/4 isometric, chừa sẵn bệ tròn trên đỉnh cho `Anchor_Topper`) đã được lưu ngay trong thư mục [`docs/references/building-concepts/`](references/building-concepts/):

| Kỷ nguyên | Cấp đại diện | Tệp ảnh tham chiếu | Điểm nhấn thiết kế |
|---|---|---|---|
| **Kỷ nguyên 1 (Lv 1–4)** | Cấp 1 | [`level-01-starter-kiosk.jpg`](references/building-concepts/level-01-starter-kiosk.jpg) | Ki-ốt gỗ mộc, mái hiên sọc san hô, đèn bão, thùng gỗ & bánh xe hông |
| **Kỷ nguyên 1 (Lv 1–4)** | Cấp 4 | [`level-04-cozy-corner-shop.jpg`](references/building-concepts/level-04-cozy-corner-shop.jpg) | Tường pastel ngọc + chân đá, hiên cột tròn, mái ngói có ô cửa áp mái & ống khói |
| **Kỷ nguyên 2 (Lv 5–9)** | Cấp 7 | [`level-07-mansard-terrace-shop.jpg`](references/building-concepts/level-07-mansard-terrace-shop.jpg) | Tiệm kem bơ góc đá nổi, cửa sổ kính lồi, sân thượng con tiện & chòi kính bát giác |
| **Kỷ nguyên 3 (Lv 10–14)** | Cấp 12 | [`level-12-paris-townhouse.jpg`](references/building-concepts/level-12-paris-townhouse.jpg) | Nhà 2 tầng kiểu Paris, ban công sắt, mái Mansard xanh ngọc viền vàng |
| **Kỷ nguyên 4 (Lv 15–19)** | Cấp 17 | [`level-17-boutique-tower.jpg`](references/building-concepts/level-17-boutique-tower.jpg) | Tháp Boutique 3 tầng vát góc, vòm kính thông tầng, giàn pergola đèn lồng góc |
| **Kỷ nguyên 5 (Lv 20)** | Cấp 20 | [`level-20-royal-palace-tower.jpg`](references/building-concepts/level-20-royal-palace-tower.jpg) | Siêu Tháp Hoàng Gia 4 tầng, sảnh 4 cột dát vàng, 4 chóp góc & mái vòm vương miện |

> **Mẹo dùng với Meshy / Tripo3D / Rodin:** Khi tải `level-17-boutique-tower.jpg` vào công cụ Image-to-3D, nhắc thêm trong prompt phụ *"wrap matching arched windows onto the side wall"* để mặt hông phải đồng bộ chi tiết cửa sổ với các cấp khác.

---

## 7. Bộ Sưu tập Đa dạng Phong cách Kiến trúc (5 Ngành hàng & Văn hóa Thế giới)

Để thành phố tránh cảm giác mọi căn nhà ở cùng một cấp đều giống hệt nhau (chỉ đổi màu sơn), bộ **7 concept kiến trúc hoàn toàn khác biệt về hình khối & văn hóa** dưới đây được thiết kế đồng bộ nền `#E8ECEF`, góc `3/4` isometric, hướng cửa `+Z` và chừa bệ tròn đỉnh mái cho `Anchor_Topper`:

| Phong cách / Ngành hàng | Tệp ảnh tham chiếu | Hình khối đặc trưng | Gợi ý gán Cấp / Ngành hàng |
|---|---|---|---|
| **Nhà Cổ tích Mái Kem (`bakery`)** | [`style-bakery-storybook-cottage.jpg`](references/building-concepts/style-bakery-storybook-cottage.jpg) | Mái ngói cong võng hình chuông, viền kem gợn sóng, cửa vòm tròn Hobbit, bồn hoa cửa sổ & ống khói gạch | Tiệm bánh ngọt (`bakery`) / Cấp 4–10 |
| **Trà thất Machiya Nhật (`cafe`)** | [`style-cafe-japanese-machiya.jpg`](references/building-concepts/style-cafe-japanese-machiya.jpg) | 2 tầng khung gỗ sẫm, mái ngói rêu uốn cong nhẹ, hiên gỗ *engawa* treo đèn lồng giấy, cửa *shoji* & *koshi* | Quán cà phê (`cafe`) / Cấp 5–13 |
| **Tháp Thư viện Thiên văn (`bookstore`)** | [`style-bookstore-owl-observatory.jpg`](references/building-concepts/style-bookstore-owl-observatory.jpg) | **Thân tháp hình trụ tròn** phá cách, tường đá & vữa xanh dương, ban công ngắm sao hông phải, chóp nón xanh cô-ban | Hiệu sách (`bookstore`) / Cấp 10–16 |
| **Nhà Kính Vườn Thảo mộc (`petshop`)** | [`style-petshop-botanical-greenhouse.jpg`](references/building-concepts/style-petshop-botanical-greenhouse.jpg) | Vòm kính nhà kính uốn cong khung xanh bạc hà + gỗ mật ong, chân tường gạch đỏ, ánh nắng ấm xuyên kính | Tiệm thú cưng (`petshop`) / Cấp 6–14 |
| **Studio Arcade Vũ trụ (`gamecenter`)** | [`style-gamecenter-cosmic-arcade.jpg`](references/building-concepts/style-gamecenter-cosmic-arcade.jpg) | Khối kén bo tròn Retro-Futuristic trắng ngọc & tím indigo, cửa đôi viền cyan, kính cong lộ máy arcade & nóc radar | Trung tâm trò chơi (`gamecenter`) / Cấp 11–18 |
| **Biệt thự Nắng Địa Trung Hải** | [`style-mediterranean-sun-villa.jpg`](references/building-concepts/style-mediterranean-sun-villa.jpg) | Kiến trúc giật cấp chữ L: hàng hiên 3 vòm tầng trệt, cầu thang đá ngoài trời, sân thượng pergola & cửa chớp xanh ngọc | Biến thể đa văn hóa / Cấp 8–15 |
| **Lầu Bát giác Pha lê Đảo Bay** | [`style-crystal-sky-pavilion.jpg`](references/building-concepts/style-crystal-sky-pavilion.jpg) | Mặt bằng **bát giác 8 cạnh**, cột đá cẩm thạch + kính màu ngọc bích, sườn bay uốn lượn & mái 2 tầng đảo bay | Biến thể Kỳ quan / Cấp 15–20 |

### 7.1 Lưu ý xử lý riêng khi đưa bộ phong cách mới vào Blender / Game
1. **Xóa đĩa đế mỏng ở 2 mẫu trụ tròn / kén:** Hai ảnh [`style-bookstore-owl-observatory.jpg`](references/building-concepts/style-bookstore-owl-observatory.jpg) và [`style-gamecenter-cosmic-arcade.jpg`](references/building-concepts/style-gamecenter-cosmic-arcade.jpg) có kèm một đĩa đế mỏng sát mặt đất; khi AI dựng xong thành `.glb`, nên xóa đĩa tròn rộng ở đáy (giữ phần chân tường chạm `Y = 0`) để khớp sạch sẽ lên thảm cỏ vuông của `LotDecor`.
2. **Bổ sung phong cách Bắc Âu Chữ A (`Nordic Alpine A-Frame`) bằng prompt nếu cần mẫu thứ 8:**
   ```text
   Cozy stylized 3D diorama building of a Nordic Alpine A-Frame timber lodge, isometric 3/4 view (front entrance bottom-left, side slope bottom-right), isolated on seamless #E8ECEF light gray backdrop, steep triangular cedar-beam & forest-green slate roof reaching near cobblestone plinth, warm glowing front glass gable, large protruding side dormer window and chunky stone chimney on right roof slope, flat circular wooden pedestal pad at top ridge apex (empty on top). No terrain slab, no fence, no trees, no people.
   ```
3. **Cách gắn nhiều loại nhà cùng tồn tại trong ClassCity 3D:**
   - Hiện tại [`ShopModel.tsx`](../src/games/classcity/components/canvas/ShopModel.tsx) tải tự động theo cấp độ (`shop_level_1.glb` … `shop_level_20.glb` — tức 1 dáng nhà chính cho mỗi cấp). Bạn hoàn toàn có thể phân bổ các phong cách trên vào các cấp khác nhau (ví dụ: Cấp 5 = *Machiya Nhật*, Cấp 6 = *Bakery Cổ tích*, Cấp 8 = *Nhà Kính*, Cấp 11 = *Địa Trung Hải*, Cấp 13 = *Tháp Thư viện*, Cấp 16 = *Arcade Vũ trụ*, Cấp 18 = *Lầu Bát giác Pha lê*).
   - Nếu sau này muốn **mỗi ngành hàng (`ShopBranch`: `bakery`, `cafe`, `bookstore`, `petshop`, `gamecenter`) dùng 1 bộ kiến trúc riêng ở cùng cấp độ**, chỉ cần quy ước tên file `shop_<branch>_t<1..5>.glb` (ví dụ `shop_cafe_t3.glb`, `shop_bookstore_t4.glb`) và báo agent nâng cấp [`ShopModel.tsx`](../src/games/classcity/components/canvas/ShopModel.tsx) ưu tiên tải theo ngành + tier trước khi fallback về `shop_level_${level}.glb`.

### 7.2 Lộ trình Tiến hóa 5 Tier (`T1 → T5`) & Bộ Prompt cho Từng Phong cách

Quy tắc ghép prompt cho công cụ **Image-to-3D / Text-to-3D**: luôn giữ tiền tố chung:
> `Cozy stylized diorama game building, isometric 3/4 view (front bottom-left, right side bottom-right), isolated on flat seamless #E8ECEF light gray studio backdrop with soft base contact shadow only, warm honey-gold lit leaded windows, clean beveled toy-diorama geometry, empty flat circular pedestal pad on top apex for Anchor_Topper. No grass terrain slab, no fence, no loose trees, no characters, no text.`

#### A. Ngành `bakery` — Tiệm Bánh Cổ tích Mái Kem (Đã có ảnh `T1`, `T2`)
- **Tier 1 (Lv 1–4) — Quầy Bánh Cổ tích Khởi nghiệp (ĐÃ CÓ ẢNH):** [`style-bakery-t1-kiosk.jpg`](references/building-concepts/style-bakery-t1-kiosk.jpg) — quầy vòm gỗ có cửa chớp mở bán, đèn bão treo, chân đá cuội, mái ngói san hô viền kem sóng & ống khói mini.
- **Tier 2 (Lv 5–9) — Tiệm Bánh Mái Chuông Cổ tích (ĐÃ CÓ ẢNH):** [`style-bakery-storybook-cottage.jpg`](references/building-concepts/style-bakery-storybook-cottage.jpg) — tiệm 1 tầng trọn vẹn có bồn hoa cửa sổ, cửa vòm Hobbit & gác áp mái nhỏ.
- **Tier 3 (Lv 10–14) — Tiệm Bánh 2 Tầng Ban công Hoa:**
  > `[Style Prefix] + Fairytale Storybook Bakery Tier 3 two-story townhouse, evolving from Tier 2 coral scalloped bell roof and wavy buttercream eaves; cobblestone plinth, oak double doors on stone steps, second floor strawberry-cream stucco with wrap-around curved timber balcony and flower planters, tall twin-flue brick chimney.`
- **Tier 4 (Lv 15–19) — Tháp Tiệm Bánh 3 Tầng Có Chóp Góc:**
  > `[Style Prefix] + Fairytale Storybook Bakery Tier 4 three-story stepped patisserie tower; 1st floor grand arched oak doorway and amber bay windows, 2nd floor wrap-around balcony with rounded corner turret bay, setback 3rd floor octagonal strawberry-cream penthouse under sweeping double-tier coral scalloped roof with cream icing eaves.`
- **Tier 5 (Lv 20) — Cung điện Bánh Hoàng gia 4 Tầng:**
  > `[Style Prefix] + Fairytale Storybook Bakery Tier 5 four-story royal confectionery palace wonder; monumental cobblestone portico, two tiers of ornate carved wooden balconies, arched golden-lit windows on all walls, twin miniature coral spice-turret pinnacles on 3rd-floor setback corners, 4th-story octagonal lantern crowned by gilded cream-trimmed coral dome.`

#### B. Ngành `cafe` — Trà thất / Quán Cà phê Machiya Nhật (Đã có ảnh `T3`)
- **Tier 1 (Lv 1–4) — Xe / Quầy Trà Đạo Gỗ Yatai:**
  > `[Style Prefix] + Japanese Machiya Cafe Tier 1 tiny wooden tea stall kiosk (Yatai), single compact dark walnut timber counter booth, warm shoji lattice shutter hatch at bottom-left, hanging twin paper lanterns, curved mossy-slate single gable roof with cedar ridge beam and circular slate apex pad.`
- **Tier 2 (Lv 5–9) — Quán Trà 1 Tầng Hiên Engawa:**
  > `[Style Prefix] + Japanese Machiya Cafe Tier 2 cozy single-story wooden teahouse, dark walnut timber frame with cream plaster panels, engawa front porch deck with sliding glowing shoji glass doors and paper lanterns, mossy-slate upturned pagoda roof overhang and circular apex pad.`
- **Tier 3 (Lv 10–14) — Trà thất Machiya 2 Tầng (ĐÃ CÓ ẢNH):** [`style-cafe-japanese-machiya.jpg`](references/building-concepts/style-cafe-japanese-machiya.jpg).
- **Tier 4 (Lv 15–19) — Trà Lầu 3 Tầng Mái Chồng Diêm:**
  > `[Style Prefix] + Japanese Machiya Cafe Tier 4 three-story traditional timber tea tower, triple tiered upturned mossy-slate pagoda eaves, two upper levels of glowing shoji windows and carved cedar balconies, ornate golden-tipped timber brackets and wide engawa veranda.`
- **Tier 5 (Lv 20) — Đại Trà Các 4 Tầng Hoàng gia:**
  > `[Style Prefix] + Japanese Machiya Cafe Tier 5 monumental four-story grand Imperial tea pagoda pavilion, majestic stone foundation plinth, triple wrap-around dark walnut verandas with warm lanterns, gilded roof ridge ornaments on four layered curved mossy-slate pagoda roofs converging to top circular stone pedestal.`

#### C. Ngành `bookstore` — Tháp Thư viện Thiên văn Trụ Tròn (Đã có ảnh `T3`)
- **Tier 1 (Lv 1–4) — Quầy Sách Tròn Vòm Cổ điển:**
  > `[Style Prefix] + Cylindrical Owl Observatory Bookstore Tier 1 tiny circular sandstone book kiosk, cozy rounded wooden book stall with front arched oak door and curved warm lantern window showing mini bookshelves, conical cobalt-blue fish-scale roof truncated into flat cream pedestal.`
- **Tier 2 (Lv 5–9) — Nhà Sách Thiên văn 1 Tầng Thân Trụ:**
  > `[Style Prefix] + Cylindrical Owl Observatory Bookstore Tier 2 single-story round sandstone and sky-blue stucco library dome cottage, projecting gabled oak entry porch with twin sconces, glowing arched cathedral book windows wrapping front and right wall, cobalt conical roof.`
- **Tier 3 (Lv 10–14) — Tháp Thư viện Tròn Ban công Ngắm sao (ĐÃ CÓ ẢNH):** [`style-bookstore-owl-observatory.jpg`](references/building-concepts/style-bookstore-owl-observatory.jpg).
- **Tier 4 (Lv 15–19) — Đại Tháp Sách 3 Tầng Vòm Đôi:**
  > `[Style Prefix] + Cylindrical Owl Observatory Bookstore Tier 4 tall three-story stepped round stone-and-sky-blue observatory tower, grand ground arched portico, wrap-around 2nd-floor brass gallery balcony, setback 3rd-floor circular clerestory glass drum under ribbed cobalt-blue and gold conical spire.`
- **Tier 5 (Lv 20) — Tổng Thư viện Thiên văn 4 Tầng:**
  > `[Style Prefix] + Cylindrical Owl Observatory Bookstore Tier 5 grand four-story Celestial Observatory Palace tower, majestic sandstone colonnade rotunda base, twin flanking miniature rounded turret bays on 3rd tier, soaring golden-ribbed cobalt dome pavilion at 4th story with brass astrolabe cornice rings.`

#### D. Ngành `petshop` — Nhà Kính Vườn Thảo mộc Sinh thái (Đã có ảnh `T2`)
- **Tier 1 (Lv 1–4) — Chòi Kính Thú cưng Khởi nghiệp:**
  > `[Style Prefix] + Botanical Glass Conservatory Petshop Tier 1 mini terracotta-brick and sage-mint arched glass garden shed, compact oak entrance door at front bottom-left, translucent curved glass roof with glowing warm sunbeams inside.`
- **Tier 2 (Lv 5–9) — Nhà Kính Vườn Thảo mộc 1 Tầng (ĐÃ CÓ ẢNH):** [`style-petshop-botanical-greenhouse.jpg`](references/building-concepts/style-petshop-botanical-greenhouse.jpg).
- **Tier 3 (Lv 10–14) — Dinh thự Nhà Kính 2 Tầng Gác Mái:**
  > `[Style Prefix] + Botanical Glass Conservatory Petshop Tier 3 two-story sage-mint iron and honey-oak conservatory villa, 1st floor brick base with grand glass portal, 2nd floor recessed glass terrace balcony and tall arched vaulted greenhouse upper roof.`
- **Tier 4 (Lv 15–19) — Tổ hợp Bách thú Kính Vòm 3 Tầng:**
  > `[Style Prefix] + Botanical Glass Conservatory Petshop Tier 4 three-story stepped Victorian crystal-and-mint conservatory complex, cross-vaulted glass wing gables, twin upper balconies overflowing with built-in planter boxes, glowing amber glass cupola dome.`
- **Tier 5 (Lv 20) — Cung điện Pha lê Sinh thái 4 Tầng:**
  > `[Style Prefix] + Botanical Glass Conservatory Petshop Tier 5 monumental four-story Imperial Crystal Botanical Palace, curved mint-gold ironwork ribs, tiered backlit stained-glass conservatory vaults and corner atrium pavilions rising to an ornate central domed skylight pedestal.`

#### E. Ngành `gamecenter` — Studio Arcade Retro-Vũ trụ (Đã có ảnh `T3`)
- **Tier 1 (Lv 1–4) — Ki-ốt Game Kén Không gian Mini:**
  > `[Style Prefix] + Cosmic Arcade Studio Pod Tier 1 tiny pearl-white and pastel-indigo space-age arcade booth, single rounded pod silhouette with glowing cyan glass front visor door, curved mini corner screen glass glowing neon amber.`
- **Tier 2 (Lv 5–9) — Tiệm Game 1 Tầng Cửa Vòm Neon:**
  > `[Style Prefix] + Cosmic Arcade Studio Pod Tier 2 single-story retro-futuristic space lounge, smooth chamfered white-and-lavender shell, glowing cyan Googie entrance visor canopy, wide illuminated corner glass showcase revealing cozy glowing arcade cabinets inside.`
- **Tier 3 (Lv 10–14) — Studio Arcade Vũ trụ 2 Tầng (ĐÃ CÓ ẢNH):** [`style-gamecenter-cosmic-arcade.jpg`](references/building-concepts/style-gamecenter-cosmic-arcade.jpg).
- **Tier 4 (Lv 15–19) — Tháp E-Sports Thiên hà 3 Tầng:**
  > `[Style Prefix] + Cosmic Arcade Studio Pod Tier 4 three-story sleek rounded pearl-white and indigo Cosmic Esports tower, stacked wrap-around glowing cyan/amber panoramic glass ribbons, cantilevered observation terrace on 3rd tier, stepped brushed-gold radar dome crown.`
- **Tier 5 (Lv 20) — Trạm Vũ trụ Giải trí Tối thượng 4 Tầng:**
  > `[Style Prefix] + Cosmic Arcade Studio Pod Tier 5 four-story grand Retro-Cosmic Citadel spire, sweeping twin-story glowing cyan glass atrium entrance, multi-tiered circular cantilevered sky decks with gold fin rings, glowing lavender crystal core and ringed radar rotunda summit.`

#### F. Hai Phong cách Mở rộng Thế giới (`Mediterranean Sun Villa` & `Crystal Sky Pavilion`)
- **Biệt thự Nắng Địa Trung Hải** (ĐÃ CÓ `T3`: [`style-mediterranean-sun-villa.jpg`](references/building-concepts/style-mediterranean-sun-villa.jpg)):
  - **T1–T2**: thu gọn còn **nhà 1 tầng hiên 2 vòm** hoặc **3 vòm**, mái ngói ống đất nung không cầu thang ngoài.
  - **T4–T5**: thêm **tháp chuông góc (bell-tower loggia)** tầng 3–4 với giàn hoa giấy tích hợp trên lan can đá vôi & vòm đài vọng cảnh trên mái đất nung.
- **Lầu Bát giác Pha lê Đảo Bay** (ĐÃ CÓ `T4`: [`style-crystal-sky-pavilion.jpg`](references/building-concepts/style-crystal-sky-pavilion.jpg)):
  - **T1–T3**: giảm xuống **đền kính 1 tầng hình bát giác** (`T1–T2`) rồi lên **lầu bát giác 2 tầng cột mảnh** (`T3`) bỏ 4 sườn bay phụ.
  - **T5 (Lv 20)**: nâng thành **Thánh điện Pha lê 4 tầng (3 tầng kính chồng + tầng đế bát giác)** có **8 sườn bay dát vàng** hội tụ lên mái chóp ngọc bích vương miện.

---

## 8. Ghi chú mở rộng cho đợt kế tiếp
Khi bạn đã có bộ nhà (hoặc muốn gen tiếp các thành phần khác), hãy báo tôi để viết tiếp bản đặc tả chi tiết & bộ prompt chuẩn khớp toạ độ game cho:
1. **Hệ thống Item Khuôn viên (`public/shared-assets/models/prop_*.glb`):** Tường bao (`prop_fence_*`), Cây cối (`prop_tree_*`), Thú cưng (`prop_pet_*` kèm animation `Idle`/`Jump`), Biển hiệu (`prop_sign_*`).
2. **Biểu tượng Ngành hàng (`public/games/classcity/models/topper_*.glb`):** Bánh kem, Cốc cà phê, Sách mở, Đầu mèo, Tay cầm game.
3. **Nhân vật Học sinh (`public/shared-assets/models/avatar_*.glb`) & Xe Tuần tra (`vehicle_*.glb`):** Kèm quy ước tên animation `Walk`, `Idle`, `Jump`, `Cheer`.
