import provider1 from "@/assets/provider-1.jpg";
import provider2 from "@/assets/provider-2.jpg";
import provider3 from "@/assets/provider-3.jpg";
import provider4 from "@/assets/provider-4.jpg";
import catPhoto from "@/assets/cat-photography.jpg";
import catVideo from "@/assets/cat-videography.jpg";
import catDecor from "@/assets/cat-decoration.jpg";
import catPaint from "@/assets/cat-painting.jpg";

export type CategorySlug =
  | "photography"
  | "videography"
  | "decoration"
  | "mehendi";

export type Category = {
  slug: CategorySlug;
  name: string;
  tagline: string;
  image: string;
  count: number;
};

export const categories: Category[] = [
  {
    slug: "photography",
    name: "Photography",
    tagline: "Capture every priceless moment",
    image: catPhoto,
    count: 142,
  },
  {
    slug: "videography",
    name: "Videography",
    tagline: "Cinematic films of your big day",
    image: catVideo,
    count: 98,
  },
  {
    slug: "decoration",
    name: "Decoration",
    tagline: "Mandap, stage & floral magic",
    image: catDecor,
    count: 76,
  },
  {
    slug: "mehendi",
    name: "Mehendi & Art",
    tagline: "Intricate henna and bridal art",
    image: catPaint,
    count: 54,
  },
];

export type Package = {
  name: "Basic" | "Standard" | "Premium";
  priceNpr: number;
  duration: string;
  features: string[];
};

export type Provider = {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  tagline: string;
  city: string;
  avatar: string;
  cover: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  startingPrice: number;
  verified: boolean;
  bio: string;
  packages: Package[];
  portfolio: string[];
  reviews: { author: string; rating: number; date: string; body: string }[];
};

export const providers: Provider[] = [
  {
    id: "p1",
    slug: "aarav-shrestha",
    name: "Aarav Shrestha",
    category: "photography",
    tagline: "Storytelling wedding photography",
    city: "Kathmandu",
    avatar: provider1,
    cover: catPhoto,
    rating: 4.9,
    reviewCount: 87,
    completedJobs: 132,
    startingPrice: 25000,
    verified: true,
    bio: "Award-winning wedding photographer with 8+ years documenting Nepali weddings — from intimate Mehendi nights to grand receptions. I focus on candid, emotion-led storytelling.",
    packages: [
      {
        name: "Basic",
        priceNpr: 25000,
        duration: "4 hours",
        features: ["1 photographer", "50 edited photos", "Online gallery", "7-day delivery"],
      },
      {
        name: "Standard",
        priceNpr: 55000,
        duration: "8 hours",
        features: [
          "2 photographers",
          "200 edited photos",
          "Printed photobook",
          "Drone coverage",
          "5-day delivery",
        ],
      },
      {
        name: "Premium",
        priceNpr: 110000,
        duration: "Full day + pre-wedding",
        features: [
          "3 photographers",
          "Unlimited edited photos",
          "Premium photobook",
          "Drone + cinematic teaser",
          "Pre-wedding shoot",
          "3-day delivery",
        ],
      },
    ],
    portfolio: [catPhoto, catDecor, catVideo, catPaint, catPhoto, catDecor],
    reviews: [
      {
        author: "Riya Karki",
        rating: 5,
        date: "Mar 2025",
        body: "Aarav captured every moment of our wedding beautifully. Worth every rupee!",
      },
      {
        author: "Suman Adhikari",
        rating: 5,
        date: "Feb 2025",
        body: "Professional, punctual and incredibly talented. Highly recommend.",
      },
      {
        author: "Pooja Maharjan",
        rating: 4,
        date: "Jan 2025",
        body: "Lovely photos. Delivery was a day late but quality made up for it.",
      },
    ],
  },
  {
    id: "p2",
    slug: "sneha-thapa",
    name: "Sneha Thapa",
    category: "videography",
    tagline: "Cinematic wedding films",
    city: "Lalitpur",
    avatar: provider2,
    cover: catVideo,
    rating: 4.8,
    reviewCount: 64,
    completedJobs: 91,
    startingPrice: 45000,
    verified: true,
    bio: "Cinematic wedding films with a documentary heart. Specialising in 4K and drone cinematography across the Kathmandu valley.",
    packages: [
      {
        name: "Basic",
        priceNpr: 45000,
        duration: "Highlight reel",
        features: ["3-min cinematic reel", "4K quality", "Licensed music", "10-day delivery"],
      },
      {
        name: "Standard",
        priceNpr: 85000,
        duration: "Full ceremony",
        features: ["10-min film", "Drone footage", "Same-day teaser", "RAW footage"],
      },
      {
        name: "Premium",
        priceNpr: 160000,
        duration: "Multi-day",
        features: [
          "Full feature film",
          "Pre-wedding video",
          "Drone + gimbal",
          "Multi-camera setup",
          "Priority delivery",
        ],
      },
    ],
    portfolio: [catVideo, catPhoto, catDecor, catVideo, catPhoto, catVideo],
    reviews: [
      {
        author: "Anish Gurung",
        rating: 5,
        date: "Apr 2025",
        body: "Our wedding film feels like a movie. Sneha is genuinely gifted.",
      },
      {
        author: "Bina Tamang",
        rating: 5,
        date: "Mar 2025",
        body: "The drone shots were breathtaking. Loved working with her team.",
      },
    ],
  },
  {
    id: "p3",
    slug: "asmita-decor",
    name: "Asmita Decors",
    category: "decoration",
    tagline: "Floral mandaps & dream stages",
    city: "Bhaktapur",
    avatar: provider3,
    cover: catDecor,
    rating: 4.7,
    reviewCount: 52,
    completedJobs: 78,
    startingPrice: 60000,
    verified: true,
    bio: "Bespoke wedding decoration — from traditional marigold mandaps to modern floral installations. We handle setup, styling and teardown.",
    packages: [
      {
        name: "Basic",
        priceNpr: 60000,
        duration: "Stage setup",
        features: ["Stage backdrop", "Sofa & flowers", "Basic lighting", "Setup & teardown"],
      },
      {
        name: "Standard",
        priceNpr: 140000,
        duration: "Stage + mandap",
        features: ["Custom mandap", "Floral entrance", "Aisle decor", "Premium lighting"],
      },
      {
        name: "Premium",
        priceNpr: 280000,
        duration: "Full venue",
        features: [
          "Complete venue styling",
          "Imported florals",
          "Hanging installations",
          "Lounge setups",
          "Coordinator on-site",
        ],
      },
    ],
    portfolio: [catDecor, catPhoto, catDecor, catVideo, catDecor, catPaint],
    reviews: [
      {
        author: "Mira Joshi",
        rating: 5,
        date: "Apr 2025",
        body: "Our venue was transformed into a fairytale. Endless compliments from guests.",
      },
      {
        author: "Rohan KC",
        rating: 4,
        date: "Feb 2025",
        body: "Great work overall, slight delay in setup but recovered well.",
      },
    ],
  },
  {
    id: "p4",
    slug: "bikash-mehendi",
    name: "Bikash Mehendi Art",
    category: "mehendi",
    tagline: "Bridal henna & body art",
    city: "Kathmandu",
    avatar: provider4,
    cover: catPaint,
    rating: 4.9,
    reviewCount: 41,
    completedJobs: 110,
    startingPrice: 8000,
    verified: false,
    bio: "Traditional and contemporary mehendi designs. Specialising in bridal henna with intricate Newari and Mughal motifs.",
    packages: [
      {
        name: "Basic",
        priceNpr: 8000,
        duration: "2 hours",
        features: ["Bride only", "Both hands (front)", "Natural henna"],
      },
      {
        name: "Standard",
        priceNpr: 18000,
        duration: "4 hours",
        features: ["Bride: full hands + feet", "Custom motifs", "Premium henna"],
      },
      {
        name: "Premium",
        priceNpr: 35000,
        duration: "Full day",
        features: [
          "Bride + 6 family members",
          "Full bridal art",
          "Touch-ups on wedding day",
        ],
      },
    ],
    portfolio: [catPaint, catPhoto, catPaint, catDecor, catPaint, catVideo],
    reviews: [
      {
        author: "Sangita Rai",
        rating: 5,
        date: "Mar 2025",
        body: "The detail in my bridal mehendi was incredible. Lasted weeks!",
      },
    ],
  },
  {
    id: "p5",
    slug: "lens-co",
    name: "Lens & Co Studio",
    category: "photography",
    tagline: "Editorial wedding photography",
    city: "Pokhara",
    avatar: provider2,
    cover: catPhoto,
    rating: 4.6,
    reviewCount: 38,
    completedJobs: 54,
    startingPrice: 35000,
    verified: true,
    bio: "Editorial-style wedding photography with a fashion-forward eye. Based in Pokhara, available across Nepal.",
    packages: [
      {
        name: "Basic",
        priceNpr: 35000,
        duration: "5 hours",
        features: ["80 edited photos", "Online gallery"],
      },
      {
        name: "Standard",
        priceNpr: 70000,
        duration: "Full day",
        features: ["250 photos", "Photobook", "Drone"],
      },
      {
        name: "Premium",
        priceNpr: 140000,
        duration: "Multi-event",
        features: ["All events", "Unlimited photos", "Pre-wedding"],
      },
    ],
    portfolio: [catPhoto, catVideo, catPhoto, catDecor, catPhoto, catPaint],
    reviews: [
      {
        author: "Nikita Pandey",
        rating: 5,
        date: "Apr 2025",
        body: "Stunning photos. The team made us feel so comfortable.",
      },
    ],
  },
  {
    id: "p6",
    slug: "marigold-events",
    name: "Marigold Events",
    category: "decoration",
    tagline: "End-to-end wedding styling",
    city: "Kathmandu",
    avatar: provider3,
    cover: catDecor,
    rating: 4.8,
    reviewCount: 29,
    completedJobs: 44,
    startingPrice: 90000,
    verified: true,
    bio: "Full-service wedding decoration with a focus on sustainable, locally-sourced florals and eco-friendly setups.",
    packages: [
      {
        name: "Basic",
        priceNpr: 90000,
        duration: "Stage",
        features: ["Stage + entrance", "Basic florals"],
      },
      {
        name: "Standard",
        priceNpr: 180000,
        duration: "Stage + mandap",
        features: ["Mandap + stage", "Premium florals", "Lighting"],
      },
      {
        name: "Premium",
        priceNpr: 350000,
        duration: "Full venue",
        features: ["Complete styling", "Custom installations"],
      },
    ],
    portfolio: [catDecor, catPhoto, catDecor, catVideo, catDecor, catPaint],
    reviews: [
      {
        author: "Aakash Shrestha",
        rating: 5,
        date: "Mar 2025",
        body: "Everything was magical. Truly above expectations.",
      },
    ],
  },
];

export type Job = {
  id: string;
  slug: string;
  title: string;
  category: CategorySlug;
  eventType: string;
  eventDate: string;
  location: string;
  budgetMin: number;
  budgetMax: number;
  description: string;
  postedBy: string;
  postedDaysAgo: number;
  proposalsCount: number;
  status: "open" | "in-progress" | "closed";
};

export const jobs: Job[] = [
  {
    id: "j1",
    slug: "wedding-photographer-kathmandu",
    title: "Wedding photographer for 3-day ceremony in Kathmandu",
    category: "photography",
    eventType: "Wedding",
    eventDate: "2025-12-14",
    location: "Kathmandu, Soaltee Hotel",
    budgetMin: 80000,
    budgetMax: 150000,
    description:
      "Looking for an experienced wedding photographer to cover our 3-day wedding ceremony including Mehendi, Haldi and the main event. We expect ~250 guests and want both candid and posed shots. Drone coverage is a plus.",
    postedBy: "Anita R.",
    postedDaysAgo: 2,
    proposalsCount: 7,
    status: "open",
  },
  {
    id: "j2",
    slug: "cinematic-videographer-pokhara",
    title: "Cinematic videographer needed for destination wedding in Pokhara",
    category: "videography",
    eventType: "Destination wedding",
    eventDate: "2025-11-22",
    location: "Pokhara, lakeside resort",
    budgetMin: 100000,
    budgetMax: 200000,
    description:
      "Destination wedding by Phewa Lake. Need a cinematic videographer with drone capability. We want a 5-7 minute highlight reel and a full ceremony cut.",
    postedBy: "Suresh M.",
    postedDaysAgo: 5,
    proposalsCount: 12,
    status: "open",
  },
  {
    id: "j3",
    slug: "stage-decoration-bhaktapur",
    title: "Floral stage decoration for engagement ceremony",
    category: "decoration",
    eventType: "Engagement",
    eventDate: "2025-10-30",
    location: "Bhaktapur",
    budgetMin: 40000,
    budgetMax: 80000,
    description:
      "Looking for a decorator to create a beautiful floral stage and entrance for our engagement at a small banquet hall. Prefer marigold and rose theme.",
    postedBy: "Nirajan T.",
    postedDaysAgo: 1,
    proposalsCount: 3,
    status: "open",
  },
  {
    id: "j4",
    slug: "bridal-mehendi-artist",
    title: "Bridal mehendi artist for wedding day",
    category: "mehendi",
    eventType: "Wedding",
    eventDate: "2025-11-05",
    location: "Lalitpur",
    budgetMin: 10000,
    budgetMax: 25000,
    description:
      "Need an experienced bridal mehendi artist for the bride and 5 family members. Looking for traditional designs with a modern twist.",
    postedBy: "Priya S.",
    postedDaysAgo: 3,
    proposalsCount: 5,
    status: "open",
  },
  {
    id: "j5",
    slug: "reception-photographer-budget",
    title: "Reception photographer (budget-friendly)",
    category: "photography",
    eventType: "Reception",
    eventDate: "2025-12-02",
    location: "Kathmandu, Hyatt Regency",
    budgetMin: 25000,
    budgetMax: 50000,
    description:
      "One-evening reception, looking for a photographer who can deliver around 100 edited photos within a week.",
    postedBy: "Manish K.",
    postedDaysAgo: 6,
    proposalsCount: 9,
    status: "open",
  },
];

export function formatNpr(amount: number) {
  return `NPR ${amount.toLocaleString("en-IN")}`;
}

export function getProviderBySlug(slug: string) {
  return providers.find((p) => p.slug === slug);
}

export function getJobBySlug(slug: string) {
  return jobs.find((j) => j.slug === slug);
}

export function getCategoryBySlug(slug: string) {
  return categories.find((c) => c.slug === slug);
}
