interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onHover: () => void;
}

export function FeatureCard({ title, description, icon, onHover }: FeatureCardProps) {
  return (
    <div
      className="bg-white/10 backdrop-blur-sm rounded-xl p-6 cursor-pointer transition-all duration-300 hover:bg-white/20"
      onMouseEnter={onHover}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-white/10 rounded-lg text-white">{icon}</div>
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <p className="text-white/80 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
