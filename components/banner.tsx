import { Sparkles } from "lucide-react";

export default function Banner() {
  return (
    <div
      id="sticky-banner"
      className="fixed top-0 start-0 z-50 flex justify-between w-full p-4 border-b-[0.1px] border-gray-700 bg-gray-800"
    >
      <div className="flex items-center mx-auto">
        <p className="flex items-center text-sm font-normal text-white ">
          <span className="inline-flex me-3 bg-blue-500 rounded-full w-8 h-8 items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-white" />
            <span className="sr-only">Sparkles icon</span>
          </span>
          <span className="font-medium">        
              React Video Editor
          </span>
        </p>
      </div>
    </div>
  );
}
