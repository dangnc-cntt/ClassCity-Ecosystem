# Hướng dẫn cho agent làm việc trong dự án ClassCity Ecosystem

## 1. Tài liệu chỉ đạo
- `docs/03-agent-build-brief.md`: brief thi công (thắng khi mâu thuẫn, trong phạm vi giai đoạn 1).
- `docs/02-system-architecture.md`: kiến trúc và công nghệ (mục 1A).
- `docs/01-classcity-feature-spec.md`: đặc tả tính năng.
- `docs/skills-governance.md`: bộ skill đang bật, thứ tự ưu tiên và các chỉnh sửa skill (đọc trước khi thêm/sửa skill).

## 2. Môi trường Windows/PowerShell
- Dùng `npm.cmd`. **Không có `npx.cmd`**: thay `npx <gói> ...` bằng `npm.cmd exec --yes -- <gói> ...`. Không đổi Execution Policy.
- Python: dùng `python` (3.14), không dùng `python3`. Đặt `$env:PYTHONUTF8='1'` khi chạy script Python đọc file UTF-8. PyYAML chưa cài toàn cục: dùng venv tạm (xem `docs/skills-governance.md` mục 7).
- Cài skill: chỉ vào dự án (`.agents/skills/`), **không dùng `-g`**, và chỉ sau khi người dùng đồng ý.

## 3. Skill
Skill đang bật nằm ở `.agents/skills/` (11 skill); skill đã tắt ở `.agents/skills-disabled/` (không dùng, không tự bật). Mỗi skill có khối **"Project overrides (ClassCity)"** ở cuối `SKILL.md`: khối này thắng mọi chỉ dẫn mâu thuẫn phía trên nó.

**Thứ tự ưu tiên:** yêu cầu người dùng > `AGENTS.md` + brief > `docs/design-plan.md` > skill. Giữa các skill UI: `fixing-accessibility` > `fixing-motion-performance` > `baseline-ui` > `frontend-design`.

### 3.1 Khi nào gọi skill nào
| Thời điểm | Skill |
|---|---|
| Cuối mỗi giai đoạn GĐ0–GĐ8 (sau `npm.cmd run verify` xanh và commit cục bộ) | `code-review-expert` |
| Đầu GĐ6, trước khi viết UI | `frontend-design` → lưu `docs/design-plan.md` |
| Sau mỗi component UI 2D | `baseline-ui`; có tương tác thì thêm `fixing-accessibility`; có hoạt ảnh DOM/CSS thì thêm `fixing-motion-performance` |
| Sau khi UI 2D hoàn chỉnh | `create-design-md` (ghi lại `DESIGN.md` từ code đã có) |
| Có trang marketing | `seo-audit`, rồi `fixing-metadata` sửa lỗi tìm được |
| App game | chỉ `fixing-metadata` cho `index.html` cơ bản (title, `lang="vi"`, favicon, `noindex`) |
| Tạo skill mới | `skill-forge`, rồi `skill-review`, rồi ghi vào `docs/skills-governance.md` |
| Người dùng yêu cầu tìm skill | `find-skills` (chỉ gợi ý, chờ duyệt mới cài) |

### 3.2 Quy tắc then chốt (đã chốt, chi tiết trong khối override của từng skill)
- **Thư viện UI**: hoạt ảnh = **GSAP**; modal = **`<dialog>` gốc**; hàm `cn` viết tay trong `src/lib/cn.ts`. Không thêm `motion`, `clsx`, `tailwind-merge`, Radix, Base UI, React Aria khi chưa được người dùng duyệt.
- **Canvas 3D không truy cập được**: mọi thao tác trên canvas phải có nút tương đương trong UI 2D; có vùng `aria-live`; tôn trọng `prefers-reduced-motion`; phím WASD bị bỏ qua khi đang gõ chữ hoặc mở dialog.
- **Font**: bắt buộc hỗ trợ dấu tiếng Việt, tự lưu trong `public/fonts/` (không CDN), ghi giấy phép vào `docs/LICENSES.md`.
- **Review mã**: skill chỉ báo cáo (P0–P3) và hỏi trước khi sửa. Chỉ được tự sửa P0/P1 khi người dùng đã cho phép trước. P0 luôn chặn việc sang giai đoạn kế. Khi review phải kiểm thêm luật R1–R10 của brief; vi phạm R1–R10 tối thiểu là P1.
- **Review cần `git diff`**: mã nguồn phải nằm trong repo git; commit cục bộ cuối mỗi giai đoạn, không `push`.
- `fixing-motion-performance` chỉ áp dụng cho DOM/CSS. Hiệu năng 3D theo brief mục 8.
- `seo-audit` không áp dụng cho app game hay hiệu năng 3D.
- Skill chạy với toàn quyền của agent: đọc nội dung skill (và script) trước khi chạy.

## 4. Quy tắc chung
- Làm tuần tự theo giai đoạn của brief. Sau mỗi giai đoạn: `npm.cmd run verify` xanh, commit cục bộ, review (3.1). Từ GĐ4, kiểm tra thực tế trên trình duyệt trước khi báo xong.
- Mâu thuẫn hoặc điều chưa rõ: hỏi người dùng, không tự đổi các mục "ĐÃ CHỐT" trong brief.
- Không thêm thư viện ngoài danh sách cho phép ở brief (mục 13).
