# Kết cấu Studio

Ứng dụng vẽ sơ đồ kết cấu dùng chung trên máy tính và tablet. Chưa có bộ giải phản lực/nội lực tự động.

## Máy tính Windows

Mở **Ket-Cau-Studio.vbs** để dùng ứng dụng và kết nối Word. Các tệp Mo-KetCau-Word.cmd và Mo-ung-dung-Word.cmd vẫn hoạt động.

Mở tài liệu Word desktop, đặt con trỏ rồi bấm **Chèn vào Word**. Ảnh cắt sát nội dung, nền trắng, 600 DPI. Hình đã chèn không tự cập nhật theo bản vẽ.

Có thể mở index.html trực tiếp để vẽ và xuất ảnh; cách này không có kết nối Word hoặc cài PWA. Nếu bridge cũ còn chạy, khởi động lại máy rồi mở ứng dụng để nạp máy chủ mới.

## Tablet cùng Wi-Fi

1. Trên máy tính mở **Mo-tren-tablet.cmd** (cần Python 3).
2. Giữ cửa sổ mở. Trên tablet mở Chrome và nhập địa chỉ http://…:18766 ở dòng **Tablet (same Wi-Fi)**.
3. Nếu Windows hỏi quyền mạng cho Python, cho phép trên mạng riêng đang dùng. Hai thiết bị phải cùng mạng, không bị Wi-Fi khách cô lập.

Máy tính phải bật khi dùng qua Wi-Fi. Tablet xuất PNG để chèn vào tài liệu, không có nút chèn Word trực tiếp.

## Cài Android và dùng ngoại tuyến

Đưa nội dung **dist/KetCauStudio-web.zip** lên nơi lưu trữ web tĩnh có **HTTPS**, giữ index.html, assets/, sw.js và manifest.webmanifest cùng cấp như trong gói.

Trên tablet mở địa chỉ HTTPS bằng Chrome. Đợi dòng **Sẵn sàng dùng ngoại tuyến**, bấm **Cài ứng dụng** nếu xuất hiện hoặc dùng menu trình duyệt để cài/thêm vào màn hình chính. Sau lần tải đầy đủ đầu tiên có thể mở lại và vẽ khi mất mạng, không cần máy tính chạy.

HTTP qua IP Wi-Fi và tệp mở trực tiếp không hỗ trợ cài/ngoại tuyến theo cơ chế này. Chưa triển khai địa chỉ HTTPS công khai trong lần nâng cấp này. Tham khảo [điều kiện PWA của MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

## Vẽ và chỉnh sửa

- **Công cụ** ẩn/hiện bảng bên cạnh. Có mẫu Dầm, Khung, Hệ ghép.
- Chọn công cụ rồi chạm vị trí đặt. Thanh, tải đều và nét thẳng cần hai điểm; kích thước cần hai điểm đo rồi một điểm đặt đường kích thước.
- **Chọn** để kéo đối tượng hoặc kéo khung chọn nhóm. Tay nắm giữa di chuyển, tay nắm đầu/cuối đổi tọa độ đầu thanh.
- **Hai ngón** để thu/phóng và di chuyển vùng nhìn. **Di chuyển trang** cho phép kéo bằng một ngón/chuột; bấm lại để trở về vẽ.
- **+ / −** để thu/phóng; **Toàn trang** đặt lại vùng nhìn. Máy tính có thể dùng Ctrl + cuộn chuột. Thu/phóng không đổi tọa độ hay tỷ lệ ảnh xuất.
- Chọn đối tượng rồi bấm **Sửa nhãn**, hoặc nhấp đúp chữ. Enter hoặc chạm ra ngoài để lưu. Chỉ số dưới: M_A, q_1; chỉ số trên: m^2, x^{12}.
- Đổi nhãn kích thước có giá trị số và cùng đơn vị có thể co/giãn thanh liên quan theo tỷ lệ. Đây là chỉnh hình học, không phải giải kết cấu.
- Hatch: bấm vùng kín hoặc chọn điểm biên rồi bấm **Xong hatch**. **Hủy thao tác** bỏ thao tác đang tạo.
- **Hoàn tác / Làm lại** phục hồi thay đổi. Đối tượng thường độc lập khi kéo riêng lẻ.

## Lưu và chuyển thiết bị

- Bản vẽ gần nhất và thư viện **Mẫu đã lưu** tự lưu trong trình duyệt đó; chưa đồng bộ tự động giữa thiết bị.
- **Lưu JSON**, chuyển tệp qua Drive/OneDrive hoặc phương thức khác, rồi **Mở JSON** trên thiết bị còn lại.
- JSON cũ vẫn mở được; các field lưới cũ được bỏ qua. JSON mới lưu tỷ lệ kết cấu và nội lực, không lưu trạng thái hoặc cỡ lưới.
- Giữ JSON làm bản sao lưu. Xóa dữ liệu trình duyệt hoặc đổi địa chỉ truy cập sẽ không dùng cùng vùng tự lưu. Mở tệp và localhost cũng có vùng lưu riêng.
- **Xuất SVG / PNG** tạo nền trắng, không có tay nắm hoặc khung chọn. PNG là 3300 × 2160 px.

## Thư mục

- index.html: giao diện chung; index.updated.html chuyển hướng tương thích tên cũ.
- assets/: mã vẽ, mã tablet/PWA, CSS và biểu tượng.
- Word-Bridge.ps1: máy chủ Windows và kết nối Word.
- tools/serve.py: máy chủ Wi-Fi, chỉ phục vụ tệp web, không có API Word.
- tools/package-web.ps1: đóng gói web để đưa lên HTTPS.
- references/: ảnh tham chiếu; archive/: bản cũ; tests/ và docs/: kiểm thử, ảnh và ghi chú.

Bản trước khi dọn được giữ trong archive/before-tablet-20260913/. Không dùng bridge Python cũ với giao diện mới.

## Sửa nhãn liên tục và sao chép

- Bấm **Sửa nhãn** một lần, rồi bấm lần lượt các đối tượng cần sửa. Enter lưu nhãn và giữ chế độ. Esc, nút Chọn hoặc bấm lại Sửa nhãn để thoát.
- Chọn một đối tượng hoặc quét chọn nhóm, bấm **Sao chép → Dán** (Ctrl+C / Ctrl+V), chọn điểm gốc và vị trí đặt bản sao. Hoàn tác/Làm lại áp dụng cho cả nhóm.
- Khi đang nhập chữ, Ctrl+C/Ctrl+V vẫn sao chép/dán văn bản như bình thường.

## Khóa phương và đổi kiểu nét

- Khi vẽ thanh, nét mảnh, nét đứt hoặc tải đều: chọn điểm đầu, giữ **Shift** rồi chọn điểm cuối để khóa ngang/đứng theo hướng gần nhất. Thả Shift để vẽ tự do. Giữ Shift cũng áp dụng khi kéo tay nắm đầu/cuối.
- Chọn một nét hoặc quét chọn nhóm, dùng **Đổi nét** trên thanh công cụ để chuyển giữa **Thanh / Nét liền mảnh / Nét đứt mảnh**. Giữ nguyên vị trí; có thể Hoàn tác. Với nhóm chứa gối hoặc tải, chỉ các đoạn nét được đổi.

## Menu File, Chỉnh sửa, Xuất hình và Chèn

- **File → Mới / Mở / Lưu / Lưu thành** quản lý từng bản vẽ JSON. Ctrl+O mở; Ctrl+S lưu; Ctrl+Shift+S lưu thành tệp khác. Khi chọn nơi lưu, chọn thư mục OneDrive để chuyển giữa hai máy.
- Trên Edge/Chrome có hỗ trợ hộp chọn tệp, Lưu ghi lại tệp đang mở trong phiên làm việc. Sau khi đóng ứng dụng, dùng Mở để chọn lại tệp. Tự lưu trình duyệt là bản phục hồi, không thay thế Lưu tệp.
- Nếu trình duyệt không hỗ trợ ghi trực tiếp, Lưu tải một bản JSON xuống; hãy chuyển tệp vào thư mục OneDrive. Không tự ghi đè tệp gốc trong chế độ này.
- **Chỉnh sửa** chứa Hoàn tác, Làm lại, Sao chép, Dán, Sửa nhãn, Tẩy, Hủy thao tác.
- **Xuất hình** chứa SVG và PNG; **Chèn** chứa Chèn vào Word khi kết nối Windows hoạt động.
- **Xong hatch** nằm trong nhóm Vẽ, dưới các thuộc tính hatch. Các lệnh được chuyển vào menu, không nhân đôi nút.
- Lưu/đóng và đồng bộ OneDrive xong trên máy thứ nhất trước khi sửa cùng tệp trên máy thứ hai. Nếu phát hiện nội dung tệp thay đổi bên ngoài, ứng dụng hỏi trước khi ghi đè.

Khả năng hộp chọn tệp phụ thuộc trình duyệt: https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker

## Mở mẫu bằng tệp và xem trước (thay thế thư viện)

Thư viện trong ứng dụng đã được bỏ. 19 mẫu từ data/templates.json đã được tách thành các tệp riêng trong **Mau-ket-cau/**. Tệp thư viện cũ giữ nguyên để đối chiếu, ứng dụng không còn đọc/ghi nó.

1. Chọn **File → Mở** hoặc Ctrl+O.
2. Bấm **Chọn thư mục…**, chọn Mau-ket-cau trong thư mục OneDrive; hoặc **Chọn tệp JSON…** để chọn một/nhiều tệp.
3. Bấm tên tệp trong danh sách để xem hình kết cấu bên cạnh.
4. Bấm **Mở bản vẽ** để đưa vào vùng vẽ. Xem trước không thay đổi bản đang làm; Hủy đóng cửa sổ.
5. **Lưu** cập nhật tệp đã mở khi trình duyệt hỗ trợ, **Lưu thành** tạo bản riêng. Với trình duyệt chỉ hỗ trợ tải tệp, dùng JSON tải xuống như hướng dẫn phía trên.

Hình xem trước nằm trong cửa sổ Mở của ứng dụng, sau khi cho phép truy cập thư mục hoặc chọn các tệp; không nằm trong hộp chọn tệp của Windows.

## Phím tắt, vẽ liên tục và kéo điểm giao

- Nhấn Esc hai lần liên tiếp để trở về **Chọn**. Một lần Esc hủy chuỗi đang vẽ; thao tác chuột/phím khác bắt đầu lại bộ đếm.
- Nhấp đúp chuột trái lên nhãn để sửa trực tiếp, hoặc **Alt+S** bật Sửa nhãn. Enter lưu; có thể chọn tiếp nhãn khác.
- Thanh, nét mảnh, nét đứt và tải đều vẽ nối tiếp: điểm cuối đoạn trước là điểm đầu đoạn sau. Đường cong nối tiếp từ điểm cuối, mỗi đoạn mới chọn thêm điểm đi qua và điểm cuối. Esc ngắt chuỗi.
- Trong nhóm Vẽ, chọn **Kéo điểm giao**, kéo nút tròn. Các nét nối, ký hiệu đặt trên biên bị đổi và hatch liên quan sẽ được điều chỉnh. Hoàn tác phục hồi cả thao tác.
- Điểm giao trong lòng các đoạn thẳng được tách thành các đoạn nối tại nút kéo, giữ các đầu ngoài. Đường cong có nút tại ba điểm đã chọn; chưa có nút giao tự động ở vị trí bất kỳ trên đường cong.
# Phím tắt và biểu thức trong nhãn

**Text dạng Equation:** mở sửa nhãn (chọn Text rồi Alt+S), nhập `M_{K2}=\frac{P L}{2}`, `\sqrt{x^2+y^2}` hoặc `\sum_{i=1}^{n} F_i`. Bảng Ω có nhóm “Mẫu Equation” để chèn phân số, căn, tổng, tích phân. Công thức hiện bản xem trước và được vẽ bằng SVG khi Enter lưu. Hỗ trợ `\frac{tử}{mẫu}`, `\sqrt{...}`, chỉ số `_{...}`, `^{...}`, chữ Hy Lạp, `\Rightarrow`; đây là bộ trình bày công thức cơ bản, không phải toàn bộ cú pháp Equation/LaTeX và không tự tính các công thức trình bày này.

**Đơn vị trong phương trình:** khai báo bằng nhãn như `P=20 kN`, `L=6 m`, `M=12 kN.m`. Phương trình `M_K2+P*L-M=0-->` sẽ cho `M_K2=-108 kN·m`. Hỗ trợ N, kN, MN; mm, cm, m; Pa, kPa, MPa, GPa và đơn vị ghép như kN/m, kN.m, m^2. Có khoảng trắng giữa số và đơn vị. Giá trị được quy đổi về hệ kN–m. Kết quả một ẩn sau khi thay các dữ kiện có thể suy ra đơn vị bằng phép nhân, chia, lũy thừa và cân bằng đơn vị hai vế. Thiếu đơn vị thì chỉ hiện số; các phép cộng/trừ có đơn vị không phù hợp sẽ báo “Đơn vị không tương thích”.

**Liên kết phương trình:** phương trình một ẩn giải ngay. Ví dụ nhãn `2*x+3-7=0-->` cho x=2, nhãn `2*y-x=0-->` tự dùng x để cho y=1. Nếu chưa có x, nhãn thứ hai hiện “Chờ dữ kiện”. Có thể nhập dữ kiện bằng nhãn `x=2`. Sửa hoặc xóa phương trình/dữ kiện nguồn sẽ cập nhật các nhãn phụ thuộc. Tên ẩn phải khớp nhau, có phân biệt chữ hoa/thường. Nghiệm đa trị, dữ kiện mâu thuẫn hoặc chuỗi phụ thuộc chưa có dữ kiện ban đầu sẽ không được tự chọn nghiệm; hệ tuyến tính đầy đủ vẫn có thể nhập trong một nhãn `giai(x+y=3; x-y=1)`.

**Giải phương trình trong nhãn:** nhập `giai(2*x+3=7)`, `giai(x^2-5*x+6=0)` hoặc hệ `giai(x+y=3; x-y=1)`. Có thể dùng `solve(...)` thay `giai(...)`. Dấu chấm phẩy ngăn các phương trình; số thập phân dùng dấu chấm. Hỗ trợ bậc nhất, bậc hai một ẩn (nghiệm thực) và hệ tuyến tính tối đa 10 ẩn, 10 phương trình; chưa hỗ trợ ẩn trong mẫu hoặc hàm lượng giác.

Kết quả tự hiện dưới ô nhập khi đề bài đầy đủ. Enter, dấu `=` sau dấu ngoặc đóng cuối cùng, hoặc bấm ra ngoài để lưu. Nhãn trên hình hiển thị nghiệm; mở lại nhãn thấy nguyên đề bài và nghiệm. Esc hủy chỉnh sửa. Ký hiệu `⇒` ngăn đề bài và kết quả khi mở lại; chỉ cần sửa phần đề bài bên trái.

**Mặt cắt — tạo bản trích:** kết cấu gốc luôn giữ nguyên. Với mặt cắt hở, chọn hai đầu đoạn mặt cắt, rồi bấm phía cần lấy và giữ chuột kéo bản trích ra ngoài. Với mặt cắt kín, chọn các đỉnh bao vùng, nhấn Enter, rồi bấm và kéo để đặt bản trích phần bên trong. Esc hủy.

Bản trích là nhóm đối tượng chỉnh sửa được, gồm dấu mặt cắt và ký hiệu N, Q, M ở đầu thanh bị cắt; không tự tính giá trị nội lực. Bấm đối tượng trong bản trích để kéo cả nhóm, Alt + bấm để chọn riêng. Lưu JSON giữ cả kết cấu gốc và bản trích. Hoàn tác bỏ lần tạo bản trích. Các bản trích cũ không được dùng làm nguồn cho lần trích mới.

- Bấm biểu tượng Lực, Tải đều hoặc Mô men để mở bảng phụ chọn chiều bằng hình minh họa. Lựa chọn được ghi nhớ cho từng công cụ.
- Bật Bắt điểm rồi mở Kiểu bắt điểm để chọn các chế độ; có thể bật nhiều chế độ cùng lúc.
- Bảng phụ tự ẩn khi chuột rời biểu tượng mở bảng và vùng bảng trong 0,25 giây. Trên tablet, chạm bên ngoài để đóng. Đóng bảng vẫn giữ công cụ và lựa chọn hiện tại.

- **T**: Thanh; **L**: nét liền mảnh; **D**: nét đứt mảnh; **C**: đường cong; **K**: kích thước.
- **TT**: nhấn T hai lần liên tiếp trong 0,7 giây để chọn Chữ (text). Nhấn T một lần chọn Thanh ngay; giữ phím T không chuyển sang Chữ.
- Các phím chữ không kích hoạt khi đang nhập nhãn, biểu thức hoặc giá trị trong ô nhập. Di chuột lên biểu tượng để xem phím tắt.

- **F3**: bật/tắt bắt điểm, giữ các lựa chọn bắt điểm đã thiết lập.
- **Giữ Alt+Ctrl và kéo chuột trái**: di chuyển trang tạm thời. Thả phím để tiếp tục công cụ đang dùng.
- Khi sửa nhãn, kết quả được tính lại ngay bên dưới ô nhập. Ví dụ sửa `P = 4*5 = 20` thành `P = 4*7 = 20` sẽ hiện kết quả mới `28`. Nhấn Enter hoặc bấm ra ngoài để lưu; mở lại nhãn sẽ thấy `P = 4*7 = 28`.
- Đường cong dùng cùng độ dày với nét liền mảnh, kể cả khi xuất hình.
