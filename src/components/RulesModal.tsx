import React from 'react';
import { X, HelpCircle, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-pop-in">
      <div className="relative w-full max-w-lg bg-[#fff9f2] rounded-3xl shadow-2xl border-4 border-[#fba886] p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-orange-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#ff5964] flex items-center justify-center text-white shadow-md">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-800">Luật Chơi Color Wars</h2>
              <p className="text-xs text-neutral-600 font-medium">Chiến thuật chiếm lĩnh toàn bộ bàn cờ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-200 hover:bg-neutral-300 flex items-center justify-center text-neutral-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rule quotation */}
        <div className="my-4 p-3.5 bg-orange-100/70 border border-orange-300/80 rounded-2xl">
          <p className="text-xs uppercase font-bold tracking-wider text-orange-800 mb-1">Mục Tiêu Trò Chơi</p>
          <p className="text-sm italic font-semibold text-neutral-800">
            &ldquo;Try to occupy the whole field with your color. Click on your circles and capture 4 new squares when you reach 4 white dots in a circle.&rdquo;
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 text-sm text-neutral-700">
          {/* Step 1 */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#00c0f8] text-white font-bold flex items-center justify-center text-xs">
              1
            </span>
            <div>
              <p className="font-bold text-neutral-900">Giai đoạn khởi đầu (Đặt quân 3 chấm):</p>
              <p className="text-neutral-600 text-xs mt-0.5">
                Hệ thống chọn ngẫu nhiên người đi đầu tiên. Từng người chơi sẽ được đặt <strong className="text-neutral-900">1 vòng tròn có sẵn 3 chấm bi</strong> vào bất kỳ ô trống nào trên bàn cờ.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#ff5964] text-white font-bold flex items-center justify-center text-xs">
              2
            </span>
            <div>
              <p className="font-bold text-neutral-900">Quy tắc chạm & thêm chấm bi:</p>
              <p className="text-neutral-600 text-xs mt-0.5">
                Khi đến lượt, <strong className="text-red-600">tuyệt đối không được bấm vào ô trống hay quân đối thủ</strong>. Bạn chỉ có thể tương tác với các vòng tròn mang màu của chính mình. Mỗi lần chạm sẽ cộng thêm 1 chấm bi trắng.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#10b981] text-white font-bold flex items-center justify-center text-xs">
              3
            </span>
            <div>
              <p className="font-bold text-neutral-900">Phát nổ hình dấu cộng (+) khi đạt 4 chấm:</p>
              <p className="text-neutral-600 text-xs mt-0.5">
                Khi một vòng tròn chạm mốc <strong className="text-neutral-900">4 chấm bi</strong>, nó sẽ phát nổ và phóng 4 luồng năng lượng hình dấu cộng sang 4 hướng thẳng (Trên, Dưới, Trái, Phải) trong phạm vi 1 ô:
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-neutral-600 pl-2">
                <li className="flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span><strong>Ô trống lân cận:</strong> Bị chiếm đóng ngay lập tức thành màu của bạn với 1 chấm bi.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span><strong>Ô của bạn hoặc đối thủ:</strong> Chuyển về màu của bạn và tăng thêm +1 chấm bi!</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#f59e0b] text-white font-bold flex items-center justify-center text-xs">
              4
            </span>
            <div>
              <p className="font-bold text-neutral-900">Phản ứng nổ dây chuyền (Chain Reaction):</p>
              <p className="text-neutral-600 text-xs mt-0.5">
                Nếu các ô kế cận sau khi nhận thêm chấm cũng đạt mốc 4 chấm, chúng sẽ tiếp tục nổ liên hoàn! Một nước đi thông minh có thể kích nổ toàn bộ bàn cờ và lật ngược tình thế!
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
              5
            </span>
            <div>
              <p className="font-bold text-neutral-900">Điều kiện chiến thắng:</p>
              <p className="text-neutral-600 text-xs mt-0.5">
                Người chơi bị mất hết quân sẽ bị loại. Trò chơi kết thúc khi <strong className="text-purple-700">chỉ còn lại duy nhất một màu trên bàn cờ</strong>. Người sở hữu màu đó là nhà vô địch!
              </p>
            </div>
          </div>
        </div>

        {/* Visual Dots Guide */}
        <div className="mt-5 p-4 bg-orange-50 rounded-2xl border border-orange-200">
          <p className="text-xs font-bold text-orange-900 uppercase tracking-wider mb-2 text-center">
            Mô Phỏng Các Mức Chấm Bi
          </p>
          <div className="grid grid-cols-4 gap-2">
            {/* 1 dot */}
            <div className="flex flex-col items-center gap-1.5 p-2 bg-white rounded-xl shadow-xs">
              <div className="w-10 h-10 rounded-full bg-[#00c0f8] flex items-center justify-center shadow-sm">
                <div className="w-2.5 h-2.5 bg-white rounded-full" />
              </div>
              <span className="text-[11px] font-bold text-neutral-700">1 Chấm</span>
            </div>
            {/* 2 dots */}
            <div className="flex flex-col items-center gap-1.5 p-2 bg-white rounded-xl shadow-xs">
              <div className="w-10 h-10 rounded-full bg-[#00c0f8] flex items-center justify-center gap-1 shadow-sm">
                <div className="w-2 h-2 bg-white rounded-full" />
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              <span className="text-[11px] font-bold text-neutral-700">2 Chấm</span>
            </div>
            {/* 3 dots */}
            <div className="flex flex-col items-center gap-1.5 p-2 bg-[#fed5ce] rounded-xl shadow-xs">
              <div className="w-10 h-10 rounded-full bg-[#ff5964] flex flex-col items-center justify-center gap-0.5 shadow-sm">
                <div className="w-2 h-2 bg-white rounded-full" />
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#ff5964]">3 Chấm (Sẵn sàng)</span>
            </div>
            {/* 4 dots */}
            <div className="flex flex-col items-center gap-1.5 p-2 bg-orange-100 rounded-xl shadow-xs border border-orange-300">
              <div className="w-10 h-10 rounded-full bg-[#ff5964] flex items-center justify-center animate-pulse shadow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-bold text-red-600">4 Chấm (NỔ TỨ PHÍA!)</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3.5 bg-[#fba886] hover:bg-[#fa9670] active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg transition text-base"
        >
          Đã Hiểu, Sẵn Sàng Chiến Đấu!
        </button>
      </div>
    </div>
  );
};
