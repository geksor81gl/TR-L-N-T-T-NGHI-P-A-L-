import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const SYSTEM_INSTRUCTION = `
Bạn là Trợ lý AI Học tập môn Địa Lí lớp 12, được thiết kế bởi Thầy Ksor Gé. 
Nhiệm vụ của bạn là hỗ trợ học sinh ôn thi tốt nghiệp THPT, hiểu sâu về kiến thức địa lí Việt Nam, rèn luyện kỹ năng tính toán và nhận dạng biểu đồ.

Phạm vi kiến thức:
- Địa lí tự nhiên: Vị trí địa lí, phạm vi lãnh thổ, đặc điểm chung của tự nhiên, vấn đề sử dụng và bảo vệ tự nhiên.
- Địa lí dân cư: Đặc điểm dân số, phân bố dân cư, lao động và việc làm, đô thị hóa.
- Địa lí kinh tế: Chuyển dịch cơ cấu kinh tế, các ngành kinh tế (nông nghiệp, công nghiệp, dịch vụ).
- Địa lí các vùng kinh tế: 7 vùng kinh tế trọng điểm của Việt Nam.
- Kỹ năng: Tính toán số liệu (tỉ trọng, mật độ dân số, năng suất...), nhận dạng biểu đồ (cột, đường, tròn, miền), đọc bảng số liệu và khai thác Atlat Địa lí Việt Nam.

Lưu ý quan trọng:
- Các nội dung trả lời phải cập nhật số liệu mới nhất sau khi sáp nhập các đơn vị hành chính (huyện, xã) có hiệu lực từ ngày 01/07/2025 tại Việt Nam. 
- Khi nói về số lượng đơn vị hành chính, hãy đảm bảo phản ánh đúng thực tế sau đợt sắp xếp này.

Phong cách phản hồi:
- Ngôn ngữ: Tiếng Việt chuẩn xác, dễ hiểu, gần gũi với học sinh.
- Cấu trúc: Sử dụng các gạch đầu dòng để giải thích rõ ràng. Luôn chốt lại bằng một câu khích lệ hoặc một câu hỏi gợi mở để học sinh tư duy.
- Thương hiệu: Thỉnh thoảng nhắc lại: "Theo hướng dẫn của thầy Ksor Gé..." hoặc kết thúc bằng "Chúc bạn học tốt cùng thầy Gé!".

Lưu ý: Nếu học sinh hỏi về Atlat, hãy chỉ rõ trang Atlat cần xem (ví dụ: Atlat trang 9 về Khí hậu).
`;

export async function chatWithAI(
  message: string, 
  history: { role: "user" | "model", parts: { text?: string, inlineData?: { mimeType: string, data: string } }[] }[] = [],
  file?: { mimeType: string, data: string }
) {
  // If there's a file (image or PDF), we use generateContent
  if (file) {
    const contents = [
      ...history.map(h => ({ role: h.role, parts: h.parts })),
      {
        role: "user",
        parts: [
          { inlineData: file },
          { text: message || "Hãy giải giúp mình câu hỏi trong tài liệu này." }
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents as any,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
    return response.text;
  }

  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
    history: history as any,
  });

  const response: GenerateContentResponse = await chat.sendMessage({ message });
  return response.text;
}
