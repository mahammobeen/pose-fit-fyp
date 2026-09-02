import { useNavigate } from "react-router-dom";
import { Play, Target, Compass } from "lucide-react";
import UserLayout from "../../components/user/UserLayout";

import squatImage from "../../assets/squate.png";
import plankImage from "../../assets/plank.png";
import armRaiseImage from "../../assets/arm_raise.png";
import sideBendImage from "../../assets/side_bend.png";

const EXERCISES = [
  {
    id: "squats",
    title: "Squats",
    category: "Lower Body",
    metric: "Knee Angle Depth",
    target: "Quads, Glutes & Hamstrings",
    description:
      "Real-time knee flexion & depth analysis. Ensures thighs break parallel while protecting knee joints and lumbar spine.",
    image: squatImage,
    badgeColor: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    id: "plank",
    title: "Plank",
    category: "Core Stability",
    metric: "Spine & Hip Alignment",
    target: "Core & Lower Back",
    description:
      "Monitors shoulder-hip-ankle line to prevent hip sagging or excessive elevation for maximum core activation.",
    image: plankImage,
    badgeColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    id: "arm_raise",
    title: "Arm Raise",
    category: "Upper Body",
    metric: "Shoulder Elevation Range",
    target: "Deltoids & Shoulders",
    description:
      "Tracks bilateral arm elevation symmetry and range of motion without compensatory torso leaning or shoulder shrugging.",
    image: armRaiseImage,
    badgeColor: "bg-purple-50 text-purple-600 border-purple-100",
  },
  {
    id: "side_bend",
    title: "Side Bend",
    category: "Flexibility & Mobility",
    metric: "Torso Flexion Angle",
    target: "Obliques & Lateral Spine",
    description:
      "Measures precise lateral torso tilt and flags rotational twist to maximize oblique engagement with strict angle gating.",
    image: sideBendImage,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-100",
  },
];

export default function PostureDetection() {
  const navigate = useNavigate();

  return (
    <UserLayout>
      <div className="min-h-screen bg-white px-4 sm:px-6 md:px-8 py-4 md:py-6 space-y-6 pb-16">
        {/* Title */}
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex flex-wrap items-center gap-2">
            Select an exercise for
            <span className="bg-blue-50 text-[#3b82f6] px-3 sm:px-4 py-1 rounded-xl">
              posture check
            </span>
          </h1>

          <p className="text-gray-400 text-xs md:text-sm mt-1 font-medium">
            Choose an exercise to start real-time AI posture analysis, rep
            counting, and audio coaching.
          </p>
        </div>

        {/* 2 Cards Per Row Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {EXERCISES.map((ex) => (
            <div
              key={ex.id}
              className="group bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              {/* Top Image Banner */}
              <div className="relative h-60 md:h-64 w-full overflow-hidden bg-gray-100">
                <img
                  src={ex.image}
                  alt={ex.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Category Badge Floating on Image */}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-xl bg-white/90 backdrop-blur-md text-gray-900 text-[11px] font-black uppercase tracking-wider shadow-sm">
                    {ex.category}
                  </span>
                </div>

                {/* Title & Target on Bottom of Image */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">
                    {ex.title}
                  </h3>

                  <p className="text-xs font-bold text-gray-200 flex items-center gap-1.5 mt-0.5">
                    <Target size={13} className="text-blue-400" />
                    <span>{ex.target}</span>
                  </p>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2.5">
                  {/* Metric Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold border ${ex.badgeColor} flex items-center gap-1.5`}
                    >
                      <Compass size={13} />
                      <span>Analyzes: {ex.metric}</span>
                    </span>
                  </div>

                  <p className="text-gray-500 text-xs md:text-sm leading-relaxed font-medium">
                    {ex.description}
                  </p>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  <button
                    onClick={() =>
                      navigate(`/user/workout/session/${ex.id}`)
                    }
                    className="w-full py-4 bg-[#fde2c4] hover:bg-[#ffd0a5] text-gray-900 font-bold uppercase tracking-widest text-xs rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>Start Detection</span>
                    <Play size={13} className="fill-gray-900" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </UserLayout>
  );
}