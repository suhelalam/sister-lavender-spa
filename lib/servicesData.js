export const serviceCategories = [
    {
      title: 'Side-by-Side Services',
      image: '/images/bodyMassage.jpg',
      description: 'Enjoy spa treatments in the same room with a friend, family member, partner, or any guest you choose.',
      link: '/services/side-by-side-services',
      slug: 'side-by-side-services',
    },
    {
      title: '💆‍♀️ Head Spa Treatments',
      image: '/images/head.jpg',
      description: 'Experience deep scalp relaxation with a rejuvenating head spa that promotes hair health, relieves tension, and enhances overall well-being.',
      link: '/services/head-spa',
      slug: 'head-spa',
    },
    {
      title: 'Body Massage Treatments',
      image: '/images/bodyMassage.jpg',
      description: 'Release tension and restore vitality with personalized body massages designed to relax muscles, improve circulation, and boost overall wellness.',
      link: '/services/body-massage',
      slug: 'body-massage',
    },
    {
      title: 'Foot Care',
      image: '/images/footCare.jpg',
      description: 'Pamper your feet with expert care—callus removal, exfoliation, and deep hydration for comfort, softness, and refreshed soles.',
      link: '/services/foot-care',
      slug: 'foot-care',
    },
    {
      title: 'Manicure Services',
      image: '/images/manicure.jpg',
      description: 'Achieve elegant, healthy hands with precision nail shaping, cuticle care, and long-lasting polish in a relaxing, hygienic setting.',
      link: '/services/manicure',
      slug: 'manicure',
    },
  ];

  // All individual services based on your actual service offerings
  export const allServices = [
    // ==================== HEAD SPA TREATMENTS ====================
    {
      id: 'fresh-boost',
      name: "Fresh Boost 速效焕活头疗",
      category: "Head Spa Treatments",
      description: "Essential oil scalp cleanse, neck, shoulder & arm massage, Tibetan sound bowl, warm/cooling eye mask. 精油洁净 + 颈部按摩 + 西藏音疗 + 眼部护理",
      duration: 40,
      price: "$69.00",
      image: "/images/head-spa-fresh-boost.jpg",
      variations: [
        {
          id: 'fresh-boost-standard',
          name: 'Standard',
          price: 6900,
          currency: 'USD',
          duration: 40 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'classic-relax',
      name: "Classic Relax 经典舒缓头疗",
      category: "Head Spa Treatments",
      description: "Herbal scalp oil therapy, full upper body massage (neck, shoulders, arms), aromatherapy, sound healing, warm eye mask. 草本护理 + 上半身按摩 + 芳香疗法 + 音疗",
      duration: 60,
      price: "$99.00",
      image: "/images/head-spa-classic-relax.jpg",
      variations: [
        {
          id: 'classic-relax-standard',
          name: 'Standard',
          price: 9900,
          currency: 'USD',
          duration: 60 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'ginger-warmth',
      name: "Ginger Warmth 生姜温热头疗",
      category: "Head Spa Treatments",
      description: "Ginger oil therapy, full back hot stone massage, Tibetan sound healing. 生姜精油 + 全背热石按摩 + 西藏音疗",
      duration: 90,
      price: "$149.00",
      image: "/images/head-spa-ginger-warmth.jpg",
      variations: [
        {
          id: 'ginger-warmth-standard',
          name: 'Standard',
          price: 14900,
          currency: 'USD',
          duration: 90 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'herbal-detox',
      name: "Herbal Detox 草本排浊护理",
      category: "Head Spa Treatments",
      description: "Detox herbal steam, hydrating facial mask, aromatherapy, neck & shoulder massage, sound healing. 草本蒸汽 + 保湿面膜 + 芳香疗法 + 颈肩按摩 + 音疗",
      duration: 70,
      price: "$139.00",
      image: "/images/head-spa-herbal-detox.jpg",
      variations: [
        {
          id: 'herbal-detox-standard',
          name: 'Standard',
          price: 13900,
          currency: 'USD',
          duration: 70 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'signature-supreme',
      name: "Signature Supreme 至尊定制护理",
      category: "Head Spa Treatments",
      description: "Scalp analysis, custom herbal blend, full-body hot stone massage, facial mask, aromatherapy, sound healing, eye care. 头发检测 + 草本定制 + 全身热石按摩 + 面膜 + 芳香疗法 + 音疗 + 眼部护理",
      duration: 100,
      price: "$179.00",
      image: "/images/head-spa-signature-supreme.jpg",
      variations: [
        {
          id: 'signature-supreme-standard',
          name: 'Standard',
          price: 17900,
          currency: 'USD',
          duration: 100 * 60000,
          version: 1
        }
      ]
    },
  
    // ==================== BODY MASSAGE TREATMENTS ====================
    {
      id: 'classic-full-body',
      name: "Classic Full Body Massage 经典全身按摩",
      category: "Body Massage Treatments",
      description: "Gentle massage for full relaxation and circulation. 适合放松身心、缓解疲劳。",
      duration: 60,
      price: "$89.00",
      image: "/images/massage-classic-full-body.jpg",
      variations: [
        {
          id: 'classic-full-body-60min',
          name: '60 Minutes',
          price: 8900,
          currency: 'USD',
          duration: 60 * 60000,
          version: 1
        },
        {
            id: 'classic-full-body-90min',
            name: '90 Minutes',
            price: 11900,
            currency: 'USD',
            duration: 90 * 60000,
            version: 1
        }
      ]
    },
    {
      id: 'deep-tissue-massage',
      name: "Deep Tissue Massage 深层组织按摩",
      category: "Body Massage Treatments",
      description: "Focused pressure to relieve chronic muscle tension. 解除深层肌肉压力，改善僵硬。",
      duration: 60,
      price: "$109.00",
      image: "/images/massage-deep-tissue.jpg",
      variations: [
        {
          id: 'deep-tissue-60min',
          name: '60 Minutes',
          price: 10900,
          currency: 'USD',
          duration: 60 * 60000,
          version: 1
        },
        {
            id: 'deep-tissue-90min',
            name: '90 Minutes',
            price: 13900,
            currency: 'USD',
            duration: 90 * 60000,
            version: 1
          }
      ]
    },
    {
      id: 'hot-stone-aromatherapy',
      name: "Hot Stone Aromatherapy Massage 热石芳疗按摩",
      category: "Body Massage Treatments",
      description: "Heated basalt stones melt away tension while essential oils calm your spirit. 深层舒缓 + 芳香释放，身心合一的享受。",
      duration: 60,
      price: "$129.00",
      image: "/images/massage-hot-stone.jpg",
      variations: [
        {
          id: 'hot-stone-60min',
          name: '60 Minutes',
          price: 12900,
          currency: 'USD',
          duration: 60 * 60000,
          version: 1
        },
        {
            id: 'hot-stone-90min',
            name: '90 Minutes',
            price: 15900,
            currency: 'USD',
            duration: 90 * 60000,
            version: 1
          }
      ]
    },
  
    // ==================== FOOT CARE ====================
    {
      id: 'basic-pedicure',
      name: "Basic Pedicure 基础足疗",
      category: "Foot Care",
      description: "Foot soak, nail shaping, cuticle trim, E-file callus removal, and regular polish. 泡脚 + 指甲修剪 + 去死皮 + 普通甲油。",
      duration: 40,
      price: "$49.00",
      image: "/images/foot-care-basic-pedicure.jpg",
      variations: [
        {
          id: 'basic-pedicure-standard',
          name: 'Standard',
          price: 4900,
          currency: 'USD',
          duration: 40 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'hydrating-pedicure',
      name: "Hydrating Pedicure 保湿足疗",
      category: "Foot Care",
      description: "Includes a moisturizing foot mask and warm towel wrap for tired feet. 基础足疗 + 足膜 + 热毛巾护理",
      duration: 50,
      price: "$59.00",
      image: "/images/foot-care-hydrating.jpg",
      variations: [
        {
          id: 'hydrating-pedicure-standard',
          name: 'Standard',
          price: 5900,
          currency: 'USD',
          duration: 50 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'aromatherapy-pedicure',
      name: "Aromatherapy Pedicure 芳香足疗",
      category: "Foot Care",
      description: "Features essential oil soak and a relaxing foot massage. 精油泡足 + 舒缓足部按摩。",
      duration: 60,
      price: "$69.00",
      image: "/images/foot-care-aromatherapy.jpg",
      variations: [
        {
          id: 'aromatherapy-pedicure-standard',
          name: 'Standard',
          price: 6900,
          currency: 'USD',
          duration: 60 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'hot-stone-paraffin-pedicure',
      name: "Hot Stone & Paraffin Pedicure 热石蜡疗足疗",
      category: "Foot Care",
      description: "Paraffin wax wrap and warm basalt stone massage for deep tension relief. 蜡疗 + 热石足部按摩，深层舒缓。",
      duration: 70,
      price: "$79.00",
      image: "/images/foot-care-hot-stone.jpg",
      variations: [
        {
          id: 'hot-stone-paraffin-standard',
          name: 'Standard',
          price: 7900,
          currency: 'USD',
          duration: 70 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'lavender-luxe-pedicure',
      name: "Lavender Luxe Pedicure 薰衣草奢华足疗",
      category: "Foot Care",
      description: "Our most luxurious foot care. Foot mask, paraffin wax, extended massage, and no chip polish. 足膜 + 蜡疗 + 延长按摩 + 凝胶甲油，一站式足部享受。",
      duration: 75,
      price: "$89.00",
      image: "/images/foot-care-lavender-luxe.jpg",
      variations: [
        {
          id: 'lavender-luxe-standard',
          name: 'Standard',
          price: 8900,
          currency: 'USD',
          duration: 75 * 60000,
          version: 1
        }
      ]
    },
  
    // ==================== MANICURE SERVICES ====================
    {
      id: 'basic-manicure',
      name: "Basic Manicure",
      category: "Manicure Services",
      description: "Standard manicure service",
      duration: 30,
      price: "$35.00",
      image: "/images/manicure-basic.jpg",
      variations: [
        {
          id: 'basic-manicure-standard',
          name: 'Standard',
          price: 3500,
          currency: 'USD',
          duration: 30 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'dazzle-dry-manicure',
      name: "Dazzle Dry Manicure",
      category: "Manicure Services",
      description: "Quick-dry manicure service",
      duration: 35,
      price: "$45.00",
      image: "/images/manicure-dazzle-dry.jpg",
      variations: [
        {
          id: 'dazzle-dry-standard',
          name: 'Standard',
          price: 4500,
          currency: 'USD',
          duration: 35 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'no-chip-manicure',
      name: "No Chip Manicure",
      category: "Manicure Services",
      description: "Long-lasting no chip manicure",
      duration: 45,
      price: "$50.00",
      image: "/images/manicure-no-chip.jpg",
      variations: [
        {
          id: 'no-chip-standard',
          name: 'Standard',
          price: 5000,
          currency: 'USD',
          duration: 45 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'dip-powder-manicure',
      name: "Dip Powder Manicure",
      category: "Manicure Services",
      description: "Dip powder manicure service",
      duration: 50,
      price: "$55.00",
      image: "/images/manicure-dip-powder.jpg",
      variations: [
        {
          id: 'dip-powder-standard',
          name: 'Standard',
          price: 5500,
          currency: 'USD',
          duration: 50 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'dip-powder-extension',
      name: "Dip Powder Extension",
      category: "Manicure Services",
      description: "Dip powder with nail extensions",
      duration: 70,
      price: "$65.00",
      image: "/images/manicure-dip-extension.jpg",
      variations: [
        {
          id: 'dip-extension-standard',
          name: 'Standard',
          price: 6500,
          currency: 'USD',
          duration: 70 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'hard-gel-overlay',
      name: "Hard Gel Overlay (No Chip)",
      category: "Manicure Services",
      description: "Hard gel overlay for natural nails",
      duration: 60,
      price: "$70.00",
      image: "/images/manicure-hard-gel-overlay.jpg",
      variations: [
        {
          id: 'hard-gel-overlay-standard',
          name: 'Standard',
          price: 7000,
          currency: 'USD',
          duration: 60 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'hard-gel-extension',
      name: "Hard Gel Extension",
      category: "Manicure Services",
      description: "Hard gel nail extensions",
      duration: 90,
      price: "$85.00",
      image: "/images/manicure-hard-gel-extension.jpg",
      variations: [
        {
          id: 'hard-gel-extension-standard',
          name: 'Standard',
          price: 8500,
          currency: 'USD',
          duration: 90 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'hard-gel-fill-in',
      name: "Hard Gel Fill-in",
      category: "Manicure Services",
      description: "Hard gel fill-in service",
      duration: 60,
      price: "$65.00",
      image: "/images/manicure-hard-gel-fill.jpg",
      variations: [
        {
          id: 'hard-gel-fill-standard',
          name: 'Standard',
          price: 6500,
          currency: 'USD',
          duration: 60 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'gel-removal',
      name: "Removal (Hard Gel / No Chip)",
      category: "Manicure Services",
      description: "Gel polish removal service",
      duration: 15,
      price: "$12.00",
      image: "/images/manicure-removal.jpg",
      variations: [
        {
          id: 'gel-removal-standard',
          name: 'Hard Gel',
          price: 1200,
          currency: 'USD',
          duration: 15 * 60000,
          version: 1
        },
        {
            id: 'no-chip-removal-standard',
            name: 'No Chip',
            price: 700,
            currency: 'USD',
            duration: 15 * 60000,
            version: 1
          }
      ]
    },
  
    // ==================== CUPPING THERAPY ====================
    {
      id: 'cupping-therapy',
      name: "🔥 Fire Cupping Therapy",
      category: "Cupping Therapy",
      description: "Designed to help relieve neck, shoulder, and lower back pain by releasing deep muscle tension and improving circulation. Especially beneficial for stiffness caused by desk work, stress, or poor posture. For best results, we recommend pairing with a 60-minute massage before cupping.",
      duration: 25,
      price: "$50.00",
      image: "/images/cupping-therapy.jpg",
      variations: [
        {
          id: 'cupping-therapy-standard',
          name: 'Standard',
          price: 5000,
          currency: 'USD',
          duration: 25 * 60000,
          version: 1
        }
      ]
    },
    {
      id: 'cupping-therapy',
      name: "Cupping Therapy",
      category: "Cupping Therapy",
      description: "Revitalize your body with cupping therapy—relieve tension, boost circulation, and restore balance.",
      duration: 25,
      price: "$35.00",
      image: "/images/cupping-therapy.jpg",
      variations: [
        {
          id: 'cupping-therapy-standard',
          name: 'Standard',
          price: 3500,
          currency: 'USD',
          duration: 25 * 60000,
          version: 1
        }
      ]
    }
  ];
  
  // Helper function to get services by category
  export function getServicesByCategory(categoryName) {
    return allServices.filter(service => service.category === categoryName);
  }
  
  // Helper function to get service by ID
  export function getServiceById(id) {
    return allServices.find(service => service.id === id);
  }
  
  // Helper function to get category by slug
  export function getCategoryBySlug(slug) {
    return serviceCategories.find(cat => cat.slug === slug);
  }
  
  // Helper function to find variation by ID
  export function getVariationById(serviceId, variationId) {
    const service = getServiceById(serviceId);
    if (!service || !service.variations) return null;
    return service.variations.find(v => v.id === variationId);
  }
  
  // Helper to get all unique categories
  export function getAllCategories() {
    return [...new Set(allServices.map(service => service.category))];
  }
