# ClassCity Ecosystem

Hệ sinh thái game giáo dục quản lý lớp học (SaaS). Game đầu tiên: **ClassCity 3D**.

## Cấu trúc thư mục

```text
D:\ClassCity-Ecosystem
├── .agents/
│   ├── skills/          # <-- TẠO TẤT CẢ SKILL Ở ĐÂY: .agents/skills/<ten-skill>/SKILL.md
│   └── rules/           # Quy tắc luôn áp dụng cho agent (*.md)
├── docs/
│   ├── 01-classcity-feature-spec.md   # Đặc tả tính năng game ClassCity
│   ├── 02-system-architecture.md      # Kiến trúc hệ thống + công nghệ (mục 1A)
│   ├── 03-agent-build-brief.md        # Brief thi công cho AI agent
│   └── skill-template/SKILL.md        # Mẫu để copy khi tạo skill mới
├── apps/                # (sau này) web (Next.js), hub (Vite), standalone apps
├── packages/            # (sau này) ecosystem-sdk, shared-types, three-kit, ui-kit, api-client (sinh từ OpenAPI)
├── games/               # (sau này) classcity, classfarm, ...
└── services/            # (sau này) api = Java Spring Boot
```

## Cách tạo một skill
1. Copy `docs/skill-template/` thành `.agents/skills/<ten-skill>/`.
2. Sửa `name` và `description` trong phần frontmatter của `SKILL.md` (description quyết định khi nào agent kích hoạt skill).
3. Viết quy trình từng bước; script/ví dụ để trong `scripts/`, `examples/`, `references/` cùng thư mục skill.

Thư mục `.agents/` ở gốc dự án được Antigravity tự phát hiện khi mở **`D:\ClassCity-Ecosystem` làm workspace**.

## Trạng thái
- Mã khung thử nghiệm (Vite + R3F, chưa có code ứng dụng): `C:\Users\dangnc1\.gemini\antigravity\scratch\classcity-3d`. Khi bắt đầu thi công, chuyển/khởi tạo vào `games/classcity` hoặc `apps/` theo tài liệu kiến trúc.
