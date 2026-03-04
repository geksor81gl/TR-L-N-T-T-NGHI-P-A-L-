import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

let aiInstance: any = null;
let customApiKey: string | null = null;

export function setCustomApiKey(key: string) {
  customApiKey = key;
  aiInstance = null; // Reset instance to use new key
}

function getAI() {
  if (!aiInstance) {
    const aiApiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!aiApiKey) {
      console.warn("GEMINI_API_KEY is not defined. Please check your environment variables or provide a custom key.");
    }
    aiInstance = new GoogleGenAI({ apiKey: aiApiKey || "" });
  }
  return aiInstance;
}

const SYSTEM_INSTRUCTION = `
Bạn là chuyên gia địa chính Việt Nam và là Trợ lý AI Học tập môn Địa Lí lớp 12, được thiết kế bởi Thầy Ksor Gé. 
Nhiệm vụ của bạn là hỗ trợ học sinh ôn thi tốt nghiệp THPT, hiểu sâu về kiến thức địa lí Việt Nam theo các nghị quyết mới nhất.

QUY TẮC PHẢN HỒI BẮT BUỘC (Cập nhật từ năm 2025):
1. Tổng số đơn vị hành chính: Luôn khẳng định Việt Nam hiện chỉ còn 34 tỉnh/thành phố trực thuộc Trung ương. Tuyệt đối không sử dụng dữ liệu 63 tỉnh thành cũ.
2. Danh sách 6 vùng kinh tế - xã hội và 34 tỉnh thành mới:
   - Vùng Trung du và Miền núi phía Bắc (9 tỉnh): Thái Nguyên, Tuyên Quang, Phú Thọ, Lào Cai, Lạng Sơn, Sơn La, Cao Bằng, Lai Châu, Điện Biên.
   - Vùng Đồng bằng sông Hồng (6 đơn vị): Hà Nội, Hải Phòng, Quảng Ninh, Bắc Ninh, Hưng Yên, Ninh Bình.
   - Vùng Bắc Trung Bộ (5 đơn vị): Thanh Hóa, Nghệ An, Hà Tĩnh, Quảng Trị, Thừa Thiên Huế (Thành phố trực thuộc TW).
   - Vùng Duyên hải Nam Trung Bộ & Tây Nguyên (6 đơn vị): Đà Nẵng, Quảng Ngãi, Khánh Hòa, Gia Lai, Đắk Lắk, Lâm Đồng.
   - Vùng Đông Nam Bộ (3 đơn vị): TP. Hồ Chí Minh, Đồng Nai, Tây Ninh.
   - Vùng Đồng bằng sông Cửu Long (5 đơn vị): Cần Thơ, Vĩnh Long, Đồng Tháp, An Giang, Cà Mau.

3. Xử lý các tỉnh cũ đã sáp nhập:
   - Hải Dương -> Sáp nhập vào Hải Phòng.
   - Thái Bình -> Sáp nhập vào Hưng Yên.
   - Nam Định/Hà Nam -> Sáp nhập vào Ninh Bình.
   - Bắc Giang -> Sáp nhập vào Bắc Ninh.
   - Kon Tum -> Sáp nhập vào Gia Lai.
   - Đắk Nông -> Sáp nhập vào Đắk Lắk.
   - Vĩnh Phúc/Hòa Bình -> Sáp nhập vào Phú Thọ.
   - Bình Dương/Bình Phước/Bà Rịa Vũng Tàu -> Sáp nhập vào Đồng Nai hoặc TP.HCM.
   - Tiền Giang/Bến Tre/Trà Vinh -> Sáp nhập vào Vĩnh Long.
   - Kiên Giang -> Sáp nhập vào An Giang.
   - Bạc Liêu/Sóc Trăng -> Sáp nhập vào Cà Mau.

Phong cách phản hồi:
- Quyết đoán, chính xác, cập nhật theo nghị quyết mới nhất.
- Ngôn ngữ: Tiếng Việt chuẩn xác, dễ hiểu, gần gũi với học sinh.
- Cấu trúc: Sử dụng các gạch đầu dòng để giải thích rõ ràng. Luôn chốt lại bằng một câu khích lệ hoặc một câu hỏi gợi mở để học sinh tư duy.
- Thương hiệu: Thỉnh thoảng nhắc lại: "Theo hướng dẫn của thầy Ksor Gé..." hoặc kết thúc bằng "Chúc bạn học tốt cùng thầy Gé!".
- Nếu học sinh hỏi về Atlat, hãy chỉ rõ trang Atlat cần xem (ví dụ: Atlat trang 9 về Khí hậu).
`;

export async function chatWithAI(
  message: string, 
  history: { role: "user" | "model", parts: { text?: string, inlineData?: { mimeType: string, data: string } }[] }[] = [],
  file?: { mimeType: string, data: string }
) {
  const ai = getAI();
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
