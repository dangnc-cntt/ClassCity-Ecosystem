# Quản trị skill (Skills Governance)

Tài liệu này ghi lại **bộ skill đang bật, thứ tự ưu tiên khi các skill mâu thuẫn, và mọi chỉnh sửa** đã áp dụng lên skill bên thứ ba. Mục tiêu: không có hai skill chỉ dẫn ngược nhau tại thời điểm agent làm việc.

## 1. Bộ skill đang bật (`.agents/skills/`, 11 skill)

| Nhóm | Skill | Nguồn | Dùng khi |
|---|---|---|---|
| Review mã | `code-review-expert` | sanyuan0704 | Cuối mỗi giai đoạn thi công |
| Thiết kế UI | `frontend-design` | anthropics | Đầu GĐ6: lập kế hoạch thiết kế |
| | `baseline-ui` | ibelick | Sau mỗi component UI 2D |
| | `fixing-accessibility` | ibelick | Mọi component có tương tác |
| | `fixing-motion-performance` | ibelick | Mọi hoạt ảnh DOM/CSS |
| | `create-design-md` | ibelick | Sau khi UI có code: ghi lại `DESIGN.md` |
| Marketing | `seo-audit`, `fixing-metadata` | coreyhaines31, ibelick | Chỉ cho trang marketing (và `index.html` cơ bản của app) |
| Quản lý skill | `skill-forge`, `skill-review` | sanyuan0704 | Tạo / kiểm tra skill của dự án |
| | `find-skills` | vercel-labs | Chỉ khi người dùng yêu cầu tìm skill |

## 2. Skill đã tắt (`.agents/skills-disabled/`, giữ lại, không xóa)
| Skill | Lý do tắt |
|---|---|
| `book-study`, `sigma`, `wiki-ingest` | Không liên quan dự án; từ kích hoạt quá rộng ("study", "learn", "teach", "explain step by step", "review", "index", "ingest") dễ chặn cuộc trò chuyện lập trình bình thường |
| `ui-skills-root` | Tầng định tuyến "dùng trước mọi việc UI" và gọi CLI `ui-skills` qua mạng: cạnh tranh với `frontend-design`/`baseline-ui`; có 1 cảnh báo Socket |
| `improve-ui` | Chỉ-đọc và **loại bỏ** phát hiện về a11y/metadata/hiệu năng, ngược với `fixing-*` (sửa trực tiếp); chồng lấn với `baseline-ui` |
| `component-canvas`, `create-canvas` | Công cụ khám phá component, không cần cho dự án |

Bật lại: chuyển thư mục về `.agents/skills/`, rồi kiểm tra xung đột theo mục 5.

## 3. Thứ tự ưu tiên khi chỉ dẫn mâu thuẫn
1. **Yêu cầu trực tiếp của người dùng**.
2. **`AGENTS.md` và `docs/03-agent-build-brief.md`** (luật dự án, danh sách thư viện cho phép, R1–R10, mục 8 hiệu năng).
3. **`docs/design-plan.md`** (quyết định thị giác của dự án).
4. **Skill**. Giữa các skill UI: `fixing-accessibility` (tên, bàn phím, focus, độ tương phản) **>** `fixing-motion-performance` **>** `baseline-ui` **>** `frontend-design` (thẩm mỹ). Thẩm mỹ không được vi phạm a11y hoặc hiệu năng.

Mỗi skill có khối **"Project overrides (ClassCity)"** ở cuối file, giữa hai dấu `CLASSCITY-OVERRIDE:start/end`. Vì khối này nằm trong chính skill nên có hiệu lực ngay lúc skill được nạp.

## 4. Các mâu thuẫn đã phát hiện và cách giải quyết

| # | Mâu thuẫn | Giải quyết |
|---|---|---|
| 1 | `baseline-ui` bắt dùng `motion/react`; dự án chốt **GSAP**; `fixing-motion-performance` dặn không đổi thư viện hoạt ảnh | GSAP. Cấm thêm `motion`, `tw-animate-css` |
| 2 | `baseline-ui` bắt dùng `cn` = `clsx` + `tailwind-merge` | Viết `src/lib/cn.ts` nhỏ trong dự án; không thêm 2 gói |
| 3 | `baseline-ui` bắt dùng Radix/Base UI/React Aria; brief cấm thêm thư viện; `fixing-accessibility` ưu tiên phần tử gốc | Dùng HTML gốc (`<dialog>` + `showModal()`...). Cần widget phức tạp thì dừng và hỏi |
| 4 | `baseline-ui`: "không thêm animation nếu không được yêu cầu" vs đặc tả yêu cầu nhiều hiệu ứng | "Được yêu cầu" = các hiệu ứng trong đặc tả + brief + hover/press |
| 5 | `baseline-ui`: phản hồi tương tác ≤ 200 ms vs hiệu ứng lên cấp/popup | 200 ms chỉ cho hover/press/toggle; popup ≤ 400 ms; chuỗi ăn mừng theo đặc tả; vẫn chỉ animate `transform`/`opacity` |
| 6 | `baseline-ui`: "không dùng `useEffect` cho thứ tính được lúc render" vs brief R5 (dọn tài nguyên bắt buộc) | `useEffect` được dùng cho listener, GSAP, AudioContext, dispose kèm cleanup |
| 7 | `baseline-ui` (không gradient, 1 màu nhấn, không đổi tracking) vs `frontend-design` ("mạo hiểm thẩm mỹ") | `baseline-ui` là mặc định cho HUD 2D; `design-plan.md` được ghi đè từng quy tắc nếu nêu rõ lý do. Cảnh 3D ngoài phạm vi |
| 8 | `frontend-design` hướng tới trang web có "hero"; hỏi lại khách về chủ đề | Dự án là HUD phủ lên canvas 3D (3D là "hero"); chủ đề đã rõ nên không hỏi; không chờ duyệt, ghi giả định vào `design-plan.md` |
| 9 | `frontend-design` không nói gì về font tiếng Việt; font từ CDN | Bắt buộc hỗ trợ dấu tiếng Việt; font tự lưu trong `public/fonts/`, không CDN (lớp học offline, dữ liệu trẻ em); ghi giấy phép vào `docs/LICENSES.md` |
| 10 | `fixing-motion-performance` bị hiểu là áp dụng cho hiệu năng 3D | Chỉ DOM/CSS. Cảnh 3D theo brief mục 8, R4, R5 |
| 11 | Phím WASD lái xe xung đột với gõ chữ trong ô nhập và với trợ năng bàn phím | Bỏ qua WASD khi focus ở `input`/`textarea`/`select`/`contenteditable` hoặc khi mở dialog |
| 12 | Canvas 3D không truy cập được (`fixing-accessibility`) | Mọi thao tác trên canvas có tương đương 2D; vùng `aria-live`; tôn trọng `prefers-reduced-motion` |
| 13 | `code-review-expert` chỉ review và buộc hỏi người dùng trước khi sửa vs thi công tự động theo giai đoạn | Giữ quy trình hỏi; ngoại lệ khi người dùng đã cho phép trước ("tự sửa P0/P1") |
| 14 | `code-review-expert` (SOLID, OCP, DIP) đánh dấu nhầm các mẫu hiệu năng R3F và các điểm nối có chủ đích | Khối override liệt kê rõ các mẫu *không* phải lỗi; không đề xuất trừu tượng ngoài các port trong brief |
| 15 | `code-review-expert` và `fixing-*` cùng bắt lỗi a11y/animation | Review mã chỉ báo cáo nếu mức P0, còn lại chuyển cho skill chuyên trách |
| 16 | `seo-audit` kích hoạt bởi "page speed", "core web vitals" (trùng việc tối ưu game) và áp dụng cho "site" nói chung | Bỏ hai cụm từ khóa; giới hạn phạm vi trang marketing; không audit app game |
| 17 | `seo-audit` và `fixing-metadata` chồng lấn | `seo-audit` kiểm tra rồi chuyển lỗi metadata cho `fixing-metadata` |
| 18 | `fixing-metadata` mặc định thêm OG/JSON-LD cho mọi trang | Với app game chỉ chỉnh `index.html` cơ bản + `noindex`; đầy đủ chỉ cho trang marketing |
| 19 | `find-skills` gợi ý cài `-g` (toàn cục) với `-y`; kích hoạt bởi mọi câu "how do I do X" | Chỉ khi người dùng yêu cầu tìm skill; không cài khi chưa được duyệt; chỉ cài vào dự án; dùng `npm.cmd exec` |
| 20 | `skill-forge` dùng `python3`, tạo skill không theo vị trí dự án, từ khóa kích hoạt chỉ tiếng Anh | `python`; `--path .agents/skills`; bắt buộc từ khóa tiếng Việt + bước kiểm tra chồng lấn |
| 21 | `create-design-md` chạy `npx` (không có trên máy); đặt `DESIGN.md` ở gốc sản phẩm; dễ bị gọi trước khi có UI | `npm.cmd exec --yes -- @google/design.md ...`; chỉ chạy sau GĐ6; coi `design-plan.md` là nguồn chỉ dẫn |
| 22 | Mô tả skill đều bằng tiếng Anh trong khi người dùng gõ tiếng Việt | Đã thêm cụm từ kích hoạt tiếng Việt vào `description` của cả 11 skill đang bật |

## 5. Quy trình khi thêm / cập nhật skill
1. **Đọc toàn bộ `SKILL.md`** và danh sách file; chạy `skill-review`.
2. **Kiểm tra chồng lấn**: đọc `description` của các skill đang bật; nếu cùng từ khóa kích hoạt, thu hẹp phạm vi hoặc tắt skill cũ (chuyển vào `skills-disabled/`).
3. **Kiểm tra mâu thuẫn** với luật dự án (thư viện, `npm.cmd`, `python`, R1–R10). Nếu có, thêm khối `CLASSCITY-OVERRIDE` và ghi vào bảng mục 4.
4. **Xác thực frontmatter** (xem mục 7).
5. Ghi nhận ở đây.

## 6. Sau khi chạy `skills update` hoặc cài lại một skill
Lệnh này **ghi đè** `SKILL.md` và làm mất chỉnh sửa. Dấu hiệu: không còn khối `CLASSCITY-OVERRIDE` trong file. Khi đó yêu cầu agent áp dụng lại: (a) khối override và (b) các sửa `description` ở mục 4 (các dòng 16, 19, 22) và sửa nội dung cài đặt của `find-skills` (Step 6, không `-g`). Kiểm tra nhanh:

```powershell
Get-ChildItem .agents\skills -Directory | ForEach-Object {
  $f = Join-Path $_.FullName 'SKILL.md'
  $has = (Get-Content $f -Raw) -match 'CLASSCITY-OVERRIDE:start'
  '{0,-28} override={1}' -f $_.Name, $has
}
```
Cả 11 skill đang bật hiện đều có đúng một khối override (đã kiểm tra bằng lệnh trên).

## 7. Xác thực frontmatter (`skill-forge/scripts/quick_validate.py`)
Script cần PyYAML (chưa cài toàn cục) và đọc UTF-8. Dùng môi trường ảo tạm, không cài vào Python hệ thống:
```powershell
python -m venv $env:TEMP\skillvenv; & $env:TEMP\skillvenv\Scripts\python.exe -m pip install --quiet pyyaml
$env:PYTHONUTF8='1'
Get-ChildItem .agents\skills -Directory -Name | ForEach-Object { "$_ : " + (& $env:TEMP\skillvenv\Scripts\python.exe .agents\skills\skill-forge\scripts\quick_validate.py ".agents\skills\$_") }
```
Giới hạn của script: `description` ≤ 1024 ký tự, không chứa `<` `>`; khóa frontmatter chỉ gồm `name`, `description`, `license`, `allowed-tools`, `metadata`, `argument-hint`.

## 8. Lưu ý về băm
`skills-lock.json` lưu mã băm của bản gốc. Sau các chỉnh sửa này, băm của các skill đã sửa **sẽ khác** bản gốc: đó là hiện tượng bình thường, không phải lỗi.
