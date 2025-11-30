import React from 'react';


const NewTemplatesCard = () => {
  return (
    <div className="bg-gradient-to-br from-[#4A90E2] to-[#357ABD] rounded-xl p-6 text-white relative overflow-hidden shadow-lg">
      <div className="absolute top-4 left-4 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
        NEW
      </div>
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-3 leading-snug">We have added new invoicing templates!</h3>
        <p className="text-sm opacity-90 mb-6 leading-relaxed">
          New templates focused on helping you improve your business
        </p>
        <button className="bg-white text-[#4A90E2] border-none py-3 px-6 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
          Download Now
        </button>
      </div>
    </div>
  );
};

export default NewTemplatesCard;

