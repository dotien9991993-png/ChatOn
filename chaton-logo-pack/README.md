# ChatOn — Brand Logo Pack

## Cấu trúc thư mục

```
chaton-logo-pack/
├── chaton-logo-light.svg      # Logo đầy đủ — nền sáng (vector)
├── chaton-logo-dark.svg       # Logo đầy đủ — nền tối (vector)
├── chaton-logo-white.svg      # Logo trắng — nền màu (vector)
├── chaton-icon.svg            # Icon riêng (vector)
├── chaton-favicon.svg         # Favicon (vector)
├── README.md                  # File này
└── png/
    ├── chaton-logo-light-*.png    # Logo nền sáng: 1200w, 600w, 300w
    ├── chaton-logo-dark-*.png     # Logo nền tối: 1200w, 600w, 300w
    ├── chaton-logo-white-*.png    # Logo trắng: 1200w, 600w, 300w
    ├── chaton-icon-*.png          # Icon: 512, 256, 128, 64
    ├── chaton-favicon-*.png       # Favicon: 180(Apple), 48, 32, 16
    └── chaton-favicon.ico         # ICO file cho trình duyệt
```

## Bảng màu thương hiệu

| Tên          | Mã màu   | Sử dụng                    |
|--------------|-----------|------------------------------|
| Blue 700     | #1D4ED8   | Màu chính (icon gradient)    |
| Blue 600     | #2563EB   | Màu chính (chữ "On")        |
| Blue 500     | #3B82F6   | Accent, hover states         |
| Blue 400     | #60A5FA   | Chữ "On" trên nền tối       |
| Cyan 400     | #22D3EE   | Power indicator, điểm nhấn   |
| Slate 800    | #1E293B   | Chữ "Chat" trên nền sáng    |
| Slate 50     | #F1F5F9   | Chữ "Chat" trên nền tối     |

## Hướng dẫn sử dụng

- **Nền sáng/trắng**: Dùng `chaton-logo-light`
- **Nền tối/đen**: Dùng `chaton-logo-dark`
- **Nền xanh dương/màu**: Dùng `chaton-logo-white`
- **App icon / Avatar**: Dùng `chaton-icon`
- **Favicon website**: Dùng `chaton-favicon.ico` hoặc `.svg`
- **Apple Touch Icon**: Dùng `chaton-favicon-180.png`

## Font chữ

- **Primary**: Outfit (Extra Bold / 800)
- **Fallback**: Sans-serif

## Lưu ý

- Luôn ưu tiên dùng file SVG khi có thể (vector, không bị vỡ)
- File PNG đã có nền trong suốt (transparent)
- Không thay đổi tỷ lệ, màu sắc hoặc xoay logo
- Giữ khoảng trống xung quanh logo tối thiểu bằng chiều cao icon
