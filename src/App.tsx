import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  BookOpen, 
  Map, 
  Users, 
  TrendingUp, 
  Globe, 
  ChevronRight, 
  MessageSquare, 
  Sparkles, 
  GraduationCap, 
  Phone, 
  ExternalLink, 
  Info,
  Image as ImageIcon,
  X,
  FileText,
  File as FileIcon,
  Loader2
} from 'lucide-react';
import Markdown from 'react-markdown';
import mammoth from 'mammoth';
import { chatWithAI } from './services/geminiService';
import { cn } from './utils/cn';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  image?: string;
  fileName?: string;
}

const TOPICS = [
  { id: 'natural', title: 'Địa lí Tự nhiên', icon: Globe, color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'population', title: 'Địa lí Dân cư', icon: Users, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { id: 'economic', title: 'Địa lí Kinh tế', icon: TrendingUp, color: 'bg-amber-50 text-amber-600 border-amber-100' },
  { id: 'regions', title: 'Các vùng kinh tế', icon: Map, color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { id: 'skills', title: 'Tính toán, biểu đồ', icon: BookOpen, color: 'bg-rose-50 text-rose-600 border-rose-100' },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Chào bạn! Tôi là Trợ lý AI Học tập môn Địa Lí lớp 12 của Thầy Ksor Gé. Tôi đã được cập nhật các số liệu mới nhất sau khi sáp nhập các đơn vị hành chính có hiệu lực từ ngày 01/07/2025. Bạn có thể gửi ảnh câu hỏi, file Word hoặc PDF để thầy giải giúp nhé! Chúc bạn học tốt cùng thầy Gé!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ file: File, preview?: string, type: 'image' | 'pdf' | 'word' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileType = file.type;
      if (fileType.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedFile({
            file,
            preview: reader.result as string,
            type: 'image'
          });
        };
        reader.readAsDataURL(file);
      } else if (fileType === 'application/pdf') {
        setSelectedFile({
          file,
          type: 'pdf'
        });
      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileType === 'application/msword'
      ) {
        setSelectedFile({
          file,
          type: 'word'
        });
      } else {
        alert('Chỉ hỗ trợ file ảnh, PDF hoặc Word (.docx)');
      }
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if ((!messageText.trim() && !selectedFile) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      image: selectedFile?.type === 'image' ? selectedFile.preview : undefined,
      fileName: selectedFile?.type !== 'image' ? selectedFile?.file.name : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const currentFile = selectedFile;
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      
      let filePart;
      let finalMessage = messageText;

      if (currentFile) {
        if (currentFile.type === 'image') {
          const base64Data = currentFile.preview!.split(',')[1];
          filePart = {
            mimeType: currentFile.file.type,
            data: base64Data
          };
        } else if (currentFile.type === 'pdf') {
          const reader = new FileReader();
          const base64Data = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(currentFile.file);
          });
          filePart = {
            mimeType: 'application/pdf',
            data: base64Data
          };
        } else if (currentFile.type === 'word') {
          // Extract text from Word file using mammoth
          const arrayBuffer = await currentFile.file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          finalMessage = `${messageText}\n\n[Nội dung từ file Word ${currentFile.file.name}]:\n${result.value}`;
        }
      }

      const aiResponse = await chatWithAI(finalMessage || "Hãy giải giúp mình câu hỏi trong tài liệu này.", history, filePart);
      
      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: aiResponse || 'Xin lỗi, tôi gặp chút trục trặc. Bạn thử lại nhé!'
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: 'Xin lỗi, tôi gặp lỗi khi xử lý tài liệu này. Vui lòng thử lại với file khác hoặc chụp ảnh câu hỏi nhé!'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto bg-slate-50 overflow-hidden font-sans antialiased">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200 px-6 py-5 flex items-center justify-between z-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-primary to-red-500 opacity-80"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-extrabold tracking-tight text-red-600 leading-tight uppercase drop-shadow-sm">ÔN ĐỊA LÍ 12 - THẦY KSOR GÉ</h1>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Trợ lý AI ôn thi tốt nghiệp THPT
            </div>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liên hệ Thầy Gé</span>
            <a href="https://zalo.me/0383752789" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
              <Phone className="w-3.5 h-3.5" />
              0383752789 (Zalo)
            </a>
          </div>
          <div className="h-10 w-px bg-slate-200"></div>
          <div className="bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-amber-700">Dữ liệu 01/07/2025</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex w-72 flex-col bg-white border-r border-slate-200 p-6 gap-6 overflow-y-auto">
          <div>
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Chủ đề trọng tâm</h2>
            <div className="space-y-2">
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => handleSend(`Hãy giúp mình ôn tập về ${topic.title}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all text-left group"
                >
                  <div className={cn("p-2.5 rounded-xl border transition-all group-hover:scale-110", topic.color)}>
                    <topic.icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-primary">{topic.title}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <div className="p-5 bg-gradient-to-br from-primary to-blue-700 rounded-3xl text-white shadow-lg shadow-primary/20 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
                <Globe className="w-24 h-24" />
              </div>
              <p className="text-xs font-bold opacity-80 uppercase tracking-wider mb-2">Lời khuyên</p>
              <p className="text-sm font-medium leading-relaxed relative z-10">"Học đúng phương pháp, ôn trúng kiến thức là chìa khóa thành công!"</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold opacity-90">
                <div className="h-px flex-1 bg-white/30"></div>
                <span>Thầy Ksor Gé</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Info className="w-5 h-5" />
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">
                Dữ liệu sáp nhập đơn vị hành chính đã được cập nhật chính xác.
              </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col relative bg-slate-50/50">
          {/* Mobile Header Contact */}
          <div className="md:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-slate-100">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
              <Phone className="w-3 h-3 text-primary" />
              Zalo: 0383752789
            </div>
            <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Data: 01/07/2025
            </div>
          </div>

          {/* Mobile Topics Scroll */}
          <div className="lg:hidden flex overflow-x-auto p-4 gap-3 border-b border-slate-200 bg-white no-scrollbar">
            {TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleSend(`Hãy giúp mình ôn tập về ${topic.title}`)}
                className={cn("flex-shrink-0 flex items-center gap-2.5 px-4 py-2 rounded-2xl text-xs font-bold border transition-all active:scale-95", topic.color)}
              >
                <topic.icon className="w-4 h-4" />
                {topic.title}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn(
                    "flex w-full gap-3",
                    message.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                    message.role === 'user' ? "bg-primary text-white" : "bg-white text-primary border border-slate-200"
                  )}>
                    {message.role === 'user' ? <Users className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                  </div>
                  
                  <div className={cn(
                    "max-w-[80%] rounded-3xl p-5 shadow-sm relative",
                    message.role === 'user' 
                      ? "bg-primary text-white rounded-tr-none" 
                      : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                  )}>
                    <div className={cn(
                      "flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest",
                      message.role === 'user' ? "text-white/60" : "text-slate-400"
                    )}>
                      {message.role === 'user' ? "Học sinh" : "Thầy Ksor Gé"}
                    </div>
                    {message.image && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-white/20">
                        <img src={message.image} alt="Uploaded" className="max-w-full h-auto" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    {message.fileName && (
                      <div className={cn(
                        "mb-3 flex items-center gap-3 p-3 rounded-xl border",
                        message.role === 'user' ? "bg-white/10 border-white/20" : "bg-slate-50 border-slate-200"
                      )}>
                        <div className={cn(
                          "p-2 rounded-lg",
                          message.fileName.endsWith('.pdf') ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {message.fileName.endsWith('.pdf') ? <FileText className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{message.fileName}</p>
                          <p className="text-[10px] opacity-60 uppercase tracking-tighter">Tài liệu đính kèm</p>
                        </div>
                      </div>
                    )}
                    <div className={cn(
                      "markdown-body",
                      message.role === 'user' ? "text-white prose-invert" : "text-slate-700"
                    )}>
                      <Markdown>{message.content}</Markdown>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="flex justify-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-white rounded-3xl p-5 rounded-tl-none border border-slate-100 flex gap-1.5 items-center">
                  <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                  <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t border-slate-200">
            {selectedFile && (
              <div className="mb-4 relative inline-block">
                {selectedFile.type === 'image' ? (
                  <img src={selectedFile.preview} alt="Preview" className="h-24 w-auto rounded-xl border-2 border-primary/20 shadow-md" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-24 w-48 flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-primary/20 shadow-md p-4 text-center">
                    <div className={cn(
                      "p-2 rounded-lg mb-2",
                      selectedFile.type === 'pdf' ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {selectedFile.type === 'pdf' ? <FileText className="w-6 h-6" /> : <FileIcon className="w-6 h-6" />}
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 truncate w-full px-2">{selectedFile.file.name}</p>
                  </div>
                )}
                <button 
                  onClick={removeSelectedFile}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg hover:bg-rose-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-3 bg-slate-50 p-2 rounded-[2rem] border border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5 transition-all shadow-inner"
            >
              <div className="flex items-center gap-1 pl-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
                  title="Thêm ảnh, PDF hoặc Word"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi thầy hoặc gửi ảnh, PDF, Word để giải..."
                className="flex-1 bg-transparent py-3 text-sm font-medium focus:outline-none text-slate-700 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={(!input.trim() && !selectedFile) || isLoading}
                className="bg-primary text-white p-3.5 rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25 active:scale-95"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleSend("Cách xem Atlat trang 9?")}
                  className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Gợi ý: Atlat trang 9
                </button>
                <button 
                  onClick={() => handleSend("Số liệu sáp nhập huyện xã mới nhất?")}
                  className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Gợi ý: Sáp nhập 2025
                </button>
              </div>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                By Thầy Ksor Gé
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
