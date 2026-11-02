# Push notification

1. Lấy token thiết bị (FCM/APNs) sau khi người dùng cho phép.
2. Đăng ký token với backend (action "kết nối"/"add connect") sau khi login; huỷ khi logout.
3. Token đổi (onTokenRefresh) → đăng ký lại.
4. Payload: đọc từ app cũ các loại thông báo và màn hình đích (deep link) → đưa vào spec chức năng "Thông báo".
5. File cấu hình Firebase (`google-services.json`, `GoogleService-Info.plist`) là cấu hình theo app — không commit vào repo public; với repo private, theo chính sách của team.
