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
    badgeColor: "bg-accent-blue/60 text-gray-700 border-accent-blue",
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
    badgeColor: "bg-brand-light/40 text-brand-dark border-brand-light",
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
    badgeColor: "bg-accent-pink/60 text-gray-700 border-accent-pink",
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
    badgeColor:
      "bg-accent-orange/60 text-accent-orange-dark border-accent-orange",
  },
];

export default function PostureDetection() {
  const navigate = useNavigate();

  return (
    <UserLayout>
      <div className="min-h-screen bg-transparent px-4 py-4 font-sans sm:px-6 md:px-8 md:py-6">
        {/* Title */}
        <div className="mx-auto max-w-6xl">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
            Select an exercise for
            <span className="rounded-btn bg-brand-light/40 px-3 py-1 text-brand-dark sm:px-4">
              posture check
            </span>
          </h1>

          <p className="mt-2 text-xs font-medium text-gray-500 md:text-sm">
            Choose an exercise to start real-time AI posture analysis, rep
            counting, and audio coaching.
          </p>
        </div>

        {/* 2 Cards Per Row Grid */}
        <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
          {EXERCISES.map((ex) => (
            <div
              key={ex.id}
              className="group flex flex-col justify-between overflow-hidden rounded-card border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
            >
              {/* Top Image Banner */}
              <div className="relative h-60 w-full overflow-hidden bg-brand-light/20 md:h-64">
                <img
                  src={ex.image}
                  alt={ex.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Category Badge Floating on Image */}
                <div className="absolute left-4 top-4">
                  <span className="rounded-btn border border-white/50 bg-surface/90 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-gray-800 shadow-card backdrop-blur-md">
                    {ex.category}
                  </span>
                </div>

                {/* Title & Target on Bottom of Image */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">
                    {ex.title}
                  </h3>

                  <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-gray-200">
                    <Target size={13} className="text-brand-light" />
                    <span>{ex.target}</span>
                  </p>
                </div>
              </div>

              {/* Content Body */}
              <div className="flex flex-1 flex-col justify-between space-y-4 p-6">
                <div className="space-y-2.5">
                  {/* Metric Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1.5 rounded-btn border px-3 py-1 text-xs font-bold ${ex.badgeColor}`}
                    >
                      <Compass size={13} />
                      <span>Analyzes: {ex.metric}</span>
                    </span>
                  </div>

                  <p className="text-xs font-medium leading-relaxed text-gray-500 md:text-sm">
                    {ex.description}
                  </p>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  <button
                    onClick={() => navigate(`/user/workout/session/${ex.id}`)}
                    className="w-full rounded-btn bg-gray-800 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>Start Detection</span>
                      <Play size={13} className="fill-white" />
                    </span>
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
