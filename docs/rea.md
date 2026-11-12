# REA: Nhạc Nhẽo / SimpMusic và phương án web app

Tài liệu này ghi kết quả phân tích ngược (Reverse Engineering Analysis) trang https://nhacnheo.pages.dev và hai kho mã nguồn mà trang dẫn tới, `baotrq/project-2b` (phần app) và `baotrq/core` (phần lõi), tại thời điểm 12/11/2026. Mục tiêu là xác định chính xác cách bản gốc lấy dữ liệu, phát nhạc và hiển thị lời, từ đó chọn kiến trúc cho một web app nghe nhạc không quảng cáo có giao diện tương đương ảnh tham chiếu.

## 1. Bản gốc là gì

Nhạc Nhẽo là bản fork cá nhân của SimpMusic, một client YouTube Music viết bằng Kotlin Multiplatform và Compose Multiplatform, chạy trên Android, Windows và macOS. Trang chủ chỉ là trang giới thiệu tĩnh trên Cloudflare Pages, có các nút tải APK, file zip cho Windows và file dmg cho Mac. Toàn bộ phần phát nhạc nằm trong ứng dụng, không nằm trên web.

Mã nguồn app tại commit `1efa482` (nhánh `main`) có 76 MB, riêng module giao diện `composeApp` 16 MB. Mã nguồn lõi tại commit `076ecd1` (nhánh `multiplatform`) có 12 MB với 593 file Kotlin, chia thành các module `common`, `data`, `domain`, `media`, `service`. Trong `service` có các gói quan trọng: `kotlinYtmusicScraper` (lớp gọi YouTube Music), `lyricsService` (lời bài hát), `spotify`, `lastfm`, `listenTogether`, `loginSync`.

## 2. Kiến trúc bản gốc

Luồng dữ liệu của bản gốc chia làm bốn tầng. Tầng giao diện Compose gọi xuống tầng repository trong `core/data`. Tầng repository gọi `YouTube` trong `service/kotlinYtmusicScraper`. Tầng này gọi trực tiếp API nội bộ của YouTube Music (InnerTube) để lấy metadata và gọi bộ trích xuất stream để lấy URL âm thanh. Tầng phát nhạc dùng Media3 ExoPlayer trên Android và trình phát của hệ điều hành trên desktop.

Các endpoint InnerTube được dùng nhiều nhất nằm trong `Ytmusic.kt`. Base URL là `https://music.youtube.com/youtubei/v1/`. Tìm kiếm là `POST search`, trang chủ và album/artist là `POST browse`, danh sách phát tiếp theo là `POST next`, lấy metadata bài là `POST https://www.youtube.com/youtubei/v1/player`. Mọi request đều gắn header `X-Goog-Api-Format-Version: 1`, `X-YouTube-Client-Name`, `X-YouTube-Client-Version`, `x-origin: https://music.youtube.com`, `Referer: https://music.youtube.com/` và tham số `prettyPrint=false`.

Client chính là `WEB_REMIX`, phiên bản `1.20260304.03.00`, số hiệu client 67, user agent Chrome 140 trên macOS. Ngoài ra source còn định nghĩa `ANDROID_MUSIC`, `ANDROID`, `IOS`, `TVHTML5`, `TVHTML5_SIMPLY`, `WEB`, `WEB_EMBEDDED` và `MWEB` để fallback. Ngôn ngữ và quốc gia lấy từ thiết bị (`hl`, `gl`), mặc định trong mã là `gl` theo vùng và `hl` theo ngôn ngữ hệ thống.

Đăng nhập dùng cookie lấy từ WebView của Google. Khi có cookie, request gắn thêm header `Cookie` và `Authorization: SAPISIDHASH <epoch>_<sha1>`, trong đó chuỗi băm là SHA1 của `"<epoch> <SAPISID> https://music.youtube.com"` (hàm `ytClient` và `getAuthorizationHeader` trong `Ytmusic.kt`). Header `X-Goog-Authuser` và `X-Goog-Pageid` xử lý trường hợp một tài khoản có nhiều kênh. Bản web của chúng ta sẽ không cần phần này vì chỉ dùng chế độ ẩn danh.

## 3. Cách lấy URL phát nhạc

Đây là phần khó nhất và là lý do bản gốc phải viết bộ trích xuất riêng. Hàm `player()` trong `YouTube.kt` gọi `WEB_REMIX` để lấy metadata, sau đó gọi `getNewPipePlayer(videoId)` để lấy danh sách cặp `itag - URL`. Danh sách này được gắn ngược vào `streamingData.formats` và `adaptiveFormats` của response.

Bộ trích xuất trên JVM (`Extractor.jvm.kt`) chạy ba tầng. Tầng một dùng PipePipe với bộ giải mã chữ ký cục bộ (`FaradayJsDecoder`). Tầng hai dùng cùng PipePipe nhưng đẩy phần giải mã lên `api.pipepipe.dev`. Tầng ba dùng NewPipeExtractor gốc của Schabi. Mỗi tầng đều kiểm tra HEAD ngẫu nhiên một URL, nếu không phải 2xx thì loại. Trên Android logic tương tự nhưng dùng OkHttp làm downloader.

Response player còn có `streamingData.expiresInSeconds`, được lưu vào bảng `NewFormatEntity` để biết khi nào URL hết hạn. Khi hết hạn, repository gọi lại `player()` và cập nhật URL. Bản gốc cũng đổi các URL tracking từ `s.youtube.com` sang `music.youtube.com` và giữ tham số `fexp`.

Với livestream, bản gốc bỏ qua format thường và lấy HLS manifest qua bộ trích xuất, vì manifest của client web bị CDN trả 403 cho từng segment.

## 4. Cách lấy lời bài hát

Module `lyricsService` gọi API riêng của dự án tại `https://api-lyrics.simpmusic.org/v1/`. Hàm `findLyricsByVideoId` là `GET /v1/{videoId}`. Kết quả là mảng các bản lời, mỗi bản có `plainLyric`, `syncedLyrics` dạng LRC theo dòng và `richSyncLyrics` dạng LRC có mốc thời gian cho từng từ. Đây chính là dữ liệu cần cho hiệu ứng chữ sáng theo từng từ trong ảnh tham chiếu.

API này trả về thành công với bài `Thằng Điên` (`videoId iYLEWqRbp9M`) khi thử ngày 12/11/2026. Bản ghi có `plainLyric`, `syncedLyrics` và `richSyncLyrics`, trong đó `richSyncLyrics` chứa các mốc như `<00:13.87>Giờ <00:14.12>tôi <00:14.31>lại`. Ngoài API riêng, client còn có fallback sang LRCLIB, Kugou, Megalobiz và Apple Music (các file `bestLrclibMatch`, `kugouLrc`, `parseTtmlLyrics` trong `lyricsService`). Với web app, ta dùng API SimpMusic trước và LRCLIB sau, đủ cho nhu cầu.

## 5. Giao diện trong ảnh tham chiếu

Ảnh là màn hình Now Playing của bản desktop. Bố cục gồm bốn vùng. Cột trái rộng khoảng 64 px chứa logo và các icon điều hướng, nền đen gần như tuyệt đối. Vùng giữa chiếm phần lớn diện tích, nền là ảnh bìa được làm mờ và phóng to, phủ gradient đỏ sẫm. Trên nền đó đặt ảnh bìa lớn bo góc, tên bài `Thằng Điên`, tên nghệ sĩ `JUSTATEE, PHƯƠNG LY`, hàng nút thích và menu. Vùng phải là bảng lời với hai tab `QUEUE` và `LYRICS` ở trên, tab `LYRICS` đang chọn. Cuối màn hình là thanh điều khiển nổi, nền gradient đỏ hồng, chứa nút shuffle, previous, play, next, repeat, thanh tiến trình, thời gian và cụm âm lượng.

Về màu, mã nguồn dùng `favoriteColor #FF4081` cho nút thích, nền tối `#121212`, các lớp phủ `#32242424` và `#8F242424`. Ảnh tham chiếu có tông đỏ gạch và hồng san hô, được tạo bởi chính ảnh bìa làm mờ chứ không phải màu cố định. Vì vậy web app sẽ lấy màu chủ đạo từ ảnh bìa của bài đang phát và pha với nền tối để tạo cảm giác liền mạch.

Về chữ, bản gốc đóng gói ba file Poppins (`poppins_regular.ttf`, `poppins_medium.ttf`, `poppins_bold.ttf`) và một file Space Mono. Poppins là font chính cho toàn bộ giao diện, Space Mono dùng cho nhãn nhỏ và màn hình thống kê. Web app sẽ tự host Poppins, không gọi Google Fonts để tránh phụ thuộc mạng và tracking.

Về chuyển động, bản gốc dùng ảnh bìa mờ làm nền, đổi bài có crossfade, lời chạy theo từng từ và tự cuộn dòng hiện tại vào giữa. Ảnh tham chiếu cho thấy các dòng lời không phải dòng hiện tại bị giảm độ tương phản mạnh, còn dòng hiện tại sáng và có gạch chân từng từ đã hát. Đây là ba chi tiết quyết định cảm giác "đẹp như bản này".

## 6. Ràng buộc khi làm trên web

Thử nghiệm ngày 12/11/2026 cho thấy ba ràng buộc kỹ thuật quan trọng. Thứ nhất, gọi thẳng `POST https://music.youtube.com/youtubei/v1/search` từ trình duyệt bằng header tối thiểu bị trả 403, và endpoint này không gửi header CORS cho origin lạ. Vì vậy toàn bộ lời gọi InnerTube phải đi qua server của mình.

Thứ hai, thư viện `youtubei.js` phiên bản 18.3.0 lấy được metadata và tìm kiếm tốt (tìm `Thằng Điên` trả đúng 20 kết quả, `getInfo` trả trạng thái OK), nhưng với các client `WEB`, `VISIONOS`, `ANDROID_VR`, `TVHTML5` đều chỉ trả `server_abr_streaming_url` (SABR) mà không trả URL từng format. Vì vậy không thể lấy URL phát trực tiếp bằng thư viện này trong cấu hình hiện tại.

Thứ ba, `yt-dlp` bản cài trên máy trả URL `videoplayback` với itag 140 (m4a, 128 kbps) cho cùng bài trong khoảng 1,7 giây, không cần cookie. URL có tham số `expire` và `ip`, nghĩa là hết hạn sau vài giờ và gắn với IP của máy gọi. Kết luận: dùng `youtubei.js` cho metadata, dùng `yt-dlp` làm bộ giải URL, và proxy âm thanh qua server để trình duyệt không phải gọi thẳng googlevideo.

Về pháp lý, bản gốc ghi rõ không lưu hay đăng tải âm thanh, nhạc phát từ server YouTube và thuộc về chủ sở hữu bản quyền. Web app của chúng ta giữ nguyên nguyên tắc đó: không host file nhạc, chỉ chuyển tiếp stream, không chèn quảng cáo, dùng cho mục đích cá nhân. Việc dùng client bên thứ ba có thể trái điều khoản của YouTube, người dùng tự chịu trách nhiệm.

## 7. Kiến trúc web app đề xuất

Frontend là Vite + React + TypeScript, không SSR, chạy tĩnh sau khi build. Backend là Express + TypeScript chạy Node 22, phục vụ API và file tĩnh. Hai phần nằm trong một npm workspace.

| Thành phần | Công nghệ | Nhiệm vụ |
|---|---|---|
| Giao diện | React 18, Vite, CSS thuần | Home, Search, Now Playing, Queue, Lyrics |
| Trạng thái | Zustand | Hàng đợi, bài hiện tại, phát/tạm dừng, lặp, shuffle, âm lượng |
| Metadata | youtubei.js 18 | Tìm kiếm, trang chủ, up next, thông tin bài |
| Giải URL stream | yt-dlp | Trả URL googlevideo cho từng videoId, cache trong bộ nhớ |
| Proxy âm thanh | Express + fetch | Chuyển tiếp Range request, giữ URL và IP phía server |
| Lời bài hát | API SimpMusic, fallback LRCLIB | Trả LRC theo dòng và theo từ |
| Font | Poppins tự host | Đồng bộ với bản gốc |

Luồng phát một bài diễn ra như sau. Người dùng bấm một bài trong kết quả tìm kiếm. Frontend gọi `GET /api/song/{videoId}` để lấy metadata và gọi `GET /api/lyrics/{videoId}` để lấy lời. Thẻ audio trỏ tới `GET /api/stream/{videoId}`. Server kiểm tra cache URL, nếu chưa có thì chạy `yt-dlp -g`, sau đó gọi tiếp googlevideo với header `Range` của trình duyệt và stream ngược về. Khi bài gần hết, frontend lấy `GET /api/upnext/{videoId}` để thêm bài kế tiếp vào hàng đợi.

## 8. Tiêu chí kiểm chứng

Mỗi mốc phải có bằng chứng thực tế trước khi sang mốc sau. API tìm kiếm phải trả đúng bài `Thằng Điên` với `videoId iYLEWqRbp9M`. API lời phải trả `richSyncLyrics` có mốc từng từ. Proxy stream phải trả 206 cho request Range và phát được ít nhất 30 giây liên tục trong trình duyệt. Giao diện phải dựng đúng bố cục bốn vùng, có lyrics chạy theo từng từ và đổi màu nền theo ảnh bìa. Build production phải qua `tsc` và `vite build` không lỗi.

## 9. Rủi ro và cách giảm

Rủi ro lớn nhất là YouTube thay đổi cơ chế chống bot hoặc bắt buộc PoToken cho mọi client, khiến `yt-dlp` hết lấy được URL. Cách giảm là cô lập phần giải URL trong một module duy nhất, có health check, có biến môi trường để truyền file cookie và có thể thay bằng resolver khác mà không đụng tới giao diện. Rủi ro thứ hai là URL stream gắn IP, nên không được trả URL trực tiếp cho trình duyệt khi deploy xa. Cách giảm là luôn proxy qua server. Rủi ro thứ ba là API lời của bên thứ ba đổi định dạng hoặc giới hạn tần suất. Cách giảm là chuẩn hóa dữ liệu về một schema nội bộ và có fallback LRCLIB.
