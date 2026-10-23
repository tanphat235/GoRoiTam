-- Reference data. Practice templates are app content; the teaching chunks are SAMPLE concept
-- summaries written for the app (NOT scripture quotations). Replace with verified texts before launch.
INSERT INTO "practice_templates" ("name", "description", "items") VALUES
 ('Buổi sáng an lành', 'Bắt đầu ngày bằng thiền ngắn và một lời nguyện.',
  '[{"key":"a","time":"06:00","label":"Thiền buổi sáng","minutes":15},{"key":"b","time":"06:20","label":"Phát nguyện một việc thiện","minutes":5}]'),
 ('Niệm Phật buổi tối', 'Kết thúc ngày bằng niệm Phật và nhìn lại.',
  '[{"key":"a","time":"20:30","label":"Niệm Phật","minutes":15},{"key":"b","time":"21:00","label":"Nhìn lại một ngày","minutes":10}]'),
 ('Đọc kinh và học giáo lý', 'Mỗi ngày một đoạn nhỏ, đọc chậm và suy ngẫm.',
  '[{"key":"a","time":"19:30","label":"Đọc kinh","minutes":20},{"key":"b","time":"19:55","label":"Ghi một điều mình hiểu","minutes":5}]');
--> statement-breakpoint
WITH s AS (
  INSERT INTO "teaching_sources" ("title", "tradition", "notes", "verified")
  VALUES ('Tóm tắt khái niệm Phật pháp (mẫu — chưa phải trích dẫn kinh)', 'dai-thua',
          'Nội dung mẫu để thử hệ thống. Cần thay bằng văn bản kinh điển đã xác minh.', false)
  RETURNING "id")
INSERT INTO "teaching_chunks" ("source_id", "locator", "text")
SELECT s."id", v.locator, v.text FROM s, (VALUES
 ('Tứ Diệu Đế', 'Khổ đau có thật và có nguyên nhân. Nhận ra khổ, tìm nguyên nhân của nó (thường là tham muốn và chấp giữ), tin rằng khổ có thể chấm dứt, và đi theo con đường thực hành cụ thể để chuyển hóa.'),
 ('Bát Chánh Đạo', 'Con đường thực hành gồm cách nhìn đúng, suy nghĩ đúng, lời nói đúng, hành động đúng, nghề nghiệp đúng, nỗ lực đúng, chánh niệm và thiền định đúng. Bắt đầu từ một việc nhỏ trong đời sống hằng ngày.'),
 ('Vô thường', 'Mọi hoàn cảnh, cảm xúc và mối quan hệ đều thay đổi. Khi thấy rõ vô thường, ta bớt bám víu vào cảm xúc đang có, bớt lo âu về tương lai và mở ra khả năng chuyển hóa.'),
 ('Duyên khởi', 'Sự việc sinh ra từ nhiều nguyên nhân và điều kiện, không phải do một lỗi duy nhất. Nhìn theo duyên khởi giúp bớt tự trách và bớt đổ lỗi, đồng thời thấy mình có thể thay đổi một số điều kiện.'),
 ('Tham sân si', 'Ba gốc rễ của nhiều phiền não: tham (muốn mãi), sân (giận dữ, ghét bỏ), si (hiểu sai thực tại). Khi giận, hãy nhận diện cơn giận, thở chậm, chưa vội nói hay làm.'),
 ('Từ bi', 'Từ là mong người khác được an vui, bi là mong người khác bớt khổ. Từ bi bắt đầu từ việc đối xử tử tế với chính mình, rồi lan ra người thân, người khó chịu và mọi người. Từ bi không có nghĩa là chịu đựng bạo lực.'),
 ('Chánh niệm', 'Chú ý có chủ đích đến hơi thở, thân và cảm xúc ở hiện tại mà không phán xét. Thực hành ngắn mỗi ngày giúp giảm lo âu và thấy rõ phản ứng của mình trước khi hành động.'),
 ('Buông bỏ và chấp trước', 'Chấp trước là bám vào kỳ vọng rằng người hoặc việc phải như ý mình. Buông bỏ không phải là bỏ mặc, mà là làm phần mình có thể làm rồi chấp nhận phần ngoài khả năng kiểm soát.')
) AS v(locator, text);
