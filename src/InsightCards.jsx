export default function InsightCards({
    submittedForApproval = 0,
    approved = 0,
    expiringThisMonth = 0,
}) {
    const cards = [
        { title: 'Submitted for Approval', value: submittedForApproval, icon: 'ri-file-paper-2-fill', accentColor: '#e6a817', bgColor: 'bg-yellow-50/80', textColor: 'text-yellow-600', borderColor: 'border-yellow-200/50' },
        { title: 'Approved Contracts', value: approved, icon: 'ri-shield-check-fill', accentColor: '#7dc244', bgColor: 'bg-green-50/80', textColor: 'text-green-600', borderColor: 'border-green-200/50' },
        { title: 'Expiring This Month', value: expiringThisMonth, icon: 'ri-timer-flash-fill', accentColor: '#2879b6', bgColor: 'bg-blue-50/80', textColor: 'text-brand-blue', borderColor: 'border-blue-200/50' },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 min-w-0 w-full max-w-full">
            {cards.map((card, index) => (
                <div
                    key={index}
                    data-aos="fade-up"
                    data-aos-delay={index * 100}
                    data-aos-duration="800"
                    data-aos-easing="ease-out-cubic"
                    className="group relative bg-white/40 backdrop-blur-md rounded-[16px] sm:rounded-[20px] border border-white/60 shadow-lg shadow-gray-200/30 p-4 sm:p-6 flex items-center justify-between min-w-0 overflow-hidden hover:bg-white/80 hover:-translate-y-3 transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] cursor-default"
                    style={{ '--accent': card.accentColor }}
                >
                    {/* Radial Gradient Glow — visible on hover */}
                    <div
                        className="absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-20 transition-all duration-700 rounded-full blur-xl"
                        style={{ background: `radial-gradient(circle, ${card.accentColor}, ${card.accentColor}88)` }}
                    ></div>

                    {/* Floating Particles — appear on hover */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                        <div className="absolute top-4 right-4 w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: card.accentColor, animationDuration: '2s' }}></div>
                        <div className="absolute bottom-6 left-6 w-1 h-1 rounded-full animate-ping" style={{ backgroundColor: card.accentColor, animationDelay: '0.5s', animationDuration: '3s' }}></div>
                        <div className="absolute top-1/2 left-4 w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: card.accentColor, animationDelay: '1s', animationDuration: '2.5s' }}></div>
                    </div>

                    {/* Corner Accent */}
                    <div
                        className="absolute top-0 left-0 w-0 h-0 border-t-4 border-l-4 border-transparent group-hover:border-t-8 group-hover:border-l-8 transition-all duration-500 rounded-tl-lg"
                        style={{ borderTopColor: card.accentColor, borderLeftColor: card.accentColor }}
                    ></div>

                    {/* Text Content */}
                    <div className="min-w-0 flex-1 relative z-10">
                        <p className="text-[11px] sm:text-[13px] text-gray-500 mb-1 sm:mb-1.5 font-semibold tracking-wide uppercase group-hover:text-gray-700 transition-colors duration-500">{card.title}</p>
                        <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 tracking-tight drop-shadow-sm group-hover:scale-105 transition-transform duration-500 origin-left">{card.value}</p>
                    </div>

                    {/* Icon with Magnification + Rotation + Drop Shadow */}
                    <div className="relative shrink-0 flex-shrink-0 z-10">
                        <div className={`w-12 h-12 sm:w-16 sm:h-16 ${card.bgColor} backdrop-blur-sm rounded-[12px] sm:rounded-[16px] border ${card.borderColor} flex items-center justify-center transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-125 group-hover:rotate-6`}
                            style={{ transformOrigin: 'center center', filter: `drop-shadow(0 4px 8px ${card.accentColor}40)` }}
                        >
                            <i className={`${card.icon} text-2xl sm:text-3xl ${card.textColor} transition-all duration-[900ms]`}></i>
                        </div>
                        {/* Shadow beneath icon that shrinks on hover */}
                        <div
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 transition-all duration-500 ease-out group-hover:scale-75"
                            style={{
                                width: '48px',
                                height: '10px',
                                background: 'rgba(0, 0, 0, 0.15)',
                                borderRadius: '50%',
                                filter: 'blur(6px)',
                            }}
                        ></div>
                    </div>

                    {/* Hover Border Effect */}
                    <div
                        className="absolute inset-0 border-2 border-transparent rounded-[20px] transition-all duration-[900ms] opacity-0 group-hover:opacity-30 group-hover:scale-[1.02]"
                        style={{ borderColor: card.accentColor, filter: 'blur(1px)' }}
                    ></div>
                </div>
            ))}
        </div>
    )
}
