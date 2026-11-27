import type { Metadata } from "next";

// Storefront information pages. The copy is kept here so the pages stay thin and the tests can check
// the facts that must not drift from the plan (payment methods, delivery partners, the takedown rule).

export type InfoSection = {
  heading: string;
  body?: string[];
  bullets?: string[];
};

export type InfoPage = {
  slug: string;
  eyebrow: string;
  title: string;
  lead: string;
  /** Shown as a banner. Used where the text still needs the owner or a lawyer to sign it off. */
  draft?: string;
  sections: InfoSection[];
};

export function infoPageMetadata(page: InfoPage): Metadata {
  return { title: `${page.title} — MH Fashion`, description: page.lead };
}

export const CONTACT_EMAIL = (process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@mhfashion.com").trim();

/** Myanmar copy for the pages a customer reads first. Legal drafts stay English until the owner signs them off. */
export const INFO_PAGES_MY: Record<string, InfoPage> = {
  about: {
    slug: "about",
    eyebrow: "ကျွန်ုပ်တို့အကြောင်း",
    title: "MH Fashion",
    lead: "မြန်မာ ပရင့် စတူဒီယို — သင်က အွန်လိုင်းမှာ ဒီဇိုင်း လုပ်သည်၊ ကျွန်ုပ်တို့ ရိုက်နှိပ်ပြီး ပို့ပေးသည်။",
    sections: [
      {
        heading: "ကျွန်ုပ်တို့ ထုတ်လုပ်သည့် အရာများ",
        body: [
          "MH Fashion သည် စိတ်ကြိုက် အထည်အလိပ်နှင့် ဆက်စပ်ပစ္စည်းများ — တီရှပ်၊ ဟွတ်ဒီ၊ ပိုလို၊ ဘောလုံး ဂျာစီ၊ ဦးထုပ်၊ ဖုန်းအိတ်၊ ခေါင်းအုံးစွပ် နှင့် လွယ်အိတ်များကို ရိုက်နှိပ်သည်။ သင်က ထုတ်ကုန်၊ အရောင်၊ အထည်နှင့် ရိုက်နှိပ်နည်းကို ရွေးပြီး အယ်ဒီတာတွင် ပန်းချီကို ဒီဇိုင်း လုပ်သည်။",
          "MH Sport လိုင်းသည် အပိုင်းတစ်ပိုင်းစီ ပန်းချီပါသော ဘောလုံး ဂျာစီများ ဖြစ်သည်။ Nyein လိုင်းက အသင့်ရောက် — ပြသထားသည့်အတိုင်း ရောင်းချပြီး အယ်ဒီတာ မလိုပါ။",
        ],
      },
      {
        heading: "မည်သို့ လုပ်ဆောင်သည်",
        bullets: [
          "ထုတ်ကုန် စာမျက်နှာတွင် ဒီဇိုင်း လုပ်ပါ၊ သို့မဟုတ် အသင့် ဒီဇိုင်း တစ်ခုကို ရွေးပါ။",
          "KBZPay၊ Wave Pay၊ AYA Pay သို့မဟုတ် ကတ်ဖြင့် ပေးချေပါ။ ငွေ ပေးချေမှု ပြီးမှ အော်ဒါ အတည်ဖြစ်သည်။",
          "ကျွန်ုပ်တို့ အော်ဒါကို ရိုက်နှိပ်ပြီး ပို့ဆောင်သူထံ အပ်သည်။ အခြေအနေကို သင့် အော်ဒါတွင် အမြဲ မြင်နိုင်သည်။",
        ],
      },
      {
        heading: "သင့် ပန်းချီက သင့်ဆီမှာသာ",
        body: [
          "သင် တင်သည့် ဒီဇိုင်းများ၏ အခွင့်အရေးကို သင် ဆက်လက် ပိုင်ဆိုင်သည်။ သင် မှာယူသည့် ထုတ်ကုန်များပေါ်တွင် ထို ဒီဇိုင်းကို ကြော်ငြာရန်၊ ရောင်းချရန် MH Fashion ကို ခွင့်ပြုသည်။ ထို အခွင့်အရေးများကို ကိုင်ဆောင်ထားရန် တာဝန်မှာ သင့်တွင် ရှိသည်။",
        ],
      },
    ],
  },
  faq: {
    slug: "faq",
    eyebrow: "အကူအညီ",
    title: "အမေးများသော မေးခွန်းများ",
    lead: "ငွေပေးချေမှု၊ ရိုက်နှိပ်ခြင်း၊ ပို့ဆောင်မှုနှင့် ဒီဇိုင်း တစ်ခုကို တိုင်ကြားလာလျှင် မည်သို့ ဖြစ်သည်။",
    sections: [
      {
        heading: "ဘယ်လို ပေးချေနိုင်သလဲ။",
        body: [
          "KBZPay၊ Wave Pay၊ AYA Pay သို့မဟုတ် Visa နှင့် Mastercard။ ပစ္စည်း ရောက်မှ ငွေချေသည့် စနစ် မရှိပါ။ ငွေ ပေးချေမှု ပြီးမှ အော်ဒါ အတည်ဖြစ်သည်။",
        ],
      },
      {
        heading: "အော်ဒါကို ဘယ်အချိန် ရိုက်နှိပ်မလဲ။",
        body: [
          "ငွေ ပေးချေမှု အတည်ဖြစ်သည်နှင့် အော်ဒါသည် အတည်ပြုပြီး၊ ပြင်ဆင်နေသည်၊ ရိုက်နှိပ်နေသည်၊ ပို့ရန် အသင့်၊ ပို့ဆောင်သူထံ အပ်ပြီး၊ ပို့ဆောင်နေသည်၊ ရောက်ရှိပြီး ဟူသော အဆင့်များကို ဖြတ်သန်းသည်။ အဆင့်ကို သင့် အော်ဒါတွင် ပြသည်။",
        ],
      },
      {
        heading: "ပို့ဆောင်ခ ဘယ်လောက်လဲ။",
        body: [
          "MH Delivery က သင် ထည့်သည့် လိပ်စာအတွက် ပစ္စည်းတွေနှင့် အလေးချိန်အပေါ် မူတည်ပြီး ကုန်ကျစရိတ် တွက်သည်။ ကျွန်ုပ်တို့က ထပ်ဆောင်း ကုန်ကျစရိတ် မထည့်ပါ၊ ခန့်မှန်း ဂဏန်းကိုလည်း ဘယ်တော့မှ မပြပါ — တွက်ချက်မှု ရောက်လာမှ ပြေစာတွင် ထည့်သည်။",
        ],
      },
      {
        heading: "ပစ္စည်း ပြန်အမ်းနိုင်သလား။",
        body: [
          "ပစ္စည်း တစ်ခုစီကို သင့်အတွက် ရိုက်နှိပ်သည့်အတွက် ကျွန်ုပ်တို့၏ ထုတ်လုပ်မှု အမှားများ — မှားရိုက်ခြင်း၊ ပစ္စည်း မှားခြင်း သို့မဟုတ် ပို့ဆောင်စဉ် ပျက်စီးခြင်း — အတွက် ငွေ ပြန်အမ်းပေးသည်။ စိတ်ပြောင်းလဲမှုအတွက် မပါဝင်ပါ။ တင်ပြပုံကို ပြန်အမ်းခြင်း စာမျက်နှာတွင် ကြည့်ပါ။",
        ],
      },
      {
        heading: "ငါ တင်သည့် ဒီဇိုင်းကို ဘယ်သူ ပိုင်သလဲ။",
        body: [
          "သင်ပဲ ပိုင်သည်။ သင် မှာယူသည့် ထုတ်ကုန်များပေါ်တွင် ထို ဒီဇိုင်းကို ကြော်ငြာရန်၊ ရောင်းချရန် MH Fashion ကို ခွင့်ပြုသည်။ ထို အခွင့်အရေးများကို ကိုင်ဆောင်ထားရန် တာဝန်မှာ သင့်တွင် ရှိသည်။ ဒီဇိုင်း တစ်ခုကို တစ်စုံတစ်ဦး တိုင်ကြားလာလျှင် MH Fashion က တိုင်ကြားချက်ကို လက်ခံပြီး ထို ဒီဇိုင်းကို ဆိုင်မှ ဖယ်ရှားသည်။ ငွေ ပေးပြီးသား အော်ဒါကိုမူ ဆက်လက် ထုတ်လုပ် ပို့ဆောင်သည်။",
        ],
      },
      {
        heading: "ဘယ် ဆိုဒ် ရွေးရမလဲ။",
        body: [
          "ထုတ်ကုန် စာမျက်နှာ တစ်ခုစီတွင် ကိုယ်ပိုင် ဆိုဒ်များ ပြထားပြီး ဖစ် (ပုံမှန်၊ ပိုကျယ်) သည် ထုတ်ကုန်၏ အစိတ်အပိုင်း ဖြစ်သည်။ မည်သို့ တိုင်းတာရမည်ကို ဆိုဒ် လမ်းညွှန်တွင် ရှင်းပြထားတာမို့ သင်ရွေးသည့် ဂဏန်းသည် သင် လိုချင်သည့် ဂဏန်း ဖြစ်လာသည်။",
        ],
      },
    ],
  },
  shipping: {
    slug: "shipping",
    eyebrow: "အကူအညီ",
    title: "ပို့ဆောင်မှုနှင့် ပေးပို့ခြင်း",
    lead: "ပြည်တွင်း ပို့ဆောင်မှုကို MH Delivery က ဆောင်ရွက်သည်။ နိုင်ငံတကာ ပို့ဆောင်မှုကို DHL နှင့် စီစဉ်ထားသည်။",
    sections: [
      {
        heading: "ဘယ်သူ ပို့ဆောင်သလဲ",
        bullets: [
          "မြန်မာ — MH Delivery၊ တံခါးအထိ။",
          "နိုင်ငံတကာ — နိုင်ငံတကာ ရွေးချယ်စရာ ဖွင့်သည်နှင့် DHL။",
        ],
      },
      {
        heading: "ပို့ဆောင်ခ မည်သို့ တွက်သလဲ",
        body: [
          "MH Delivery က အထုပ်ထဲ ပါဝင်သည့် ပစ္စည်းများနှင့် လိပ်စာအပေါ် မူတည်ပြီး ကုန်ကျစရိတ် တွက်သည်။ သင်က MH Fashion ကို ပေးချေပြီး MH Fashion က ပို့ဆောင်သူနှင့် သီးခြား ရှင်းသည် — သင်မြင်ရသည့် ဈေးသည် ပို့ဆောင်သူ၏ ဈေး ဖြစ်ပြီး ထပ်တိုး ခန့်မှန်းချက် မဟုတ်ပါ။",
        ],
      },
      {
        heading: "ဘယ်နေရာတွေ ပို့သလဲ",
        body: [
          "ငွေရှင်းချိန်တွင် မြို့နယ်နှင့် မြို့ သို့မဟုတ် တိုင်းဒေသကြီးကို ထည့်ပါ။ ပို့ဆောင်သူက သင် ပေးသည့် ဖုန်းနံပါတ်ကို ဆက်သွယ်တာမို့ ရှည်လျားသည့် လိပ်စာထက် ဆက်သွယ်ရနိုင်သည့် နံပါတ်က ပို အရေးကြီးသည်။",
        ],
      },
      {
        heading: "ခြေရာခံခြင်း",
        body: [
          "အော်ဒါ အခြေအနေက ခြေရာခံစနစ် ဖြစ်သည် — ပို့ဆောင်သူထံ အပ်ပြီး၊ ပို့ဆောင်နေသည် နှင့် ရောက်ရှိပြီး ဆိုသည်မှာ ပို့ဆောင်သူ၏ ကိုယ်ပိုင် အဆင့်များ ဖြစ်သည်။",
        ],
      },
    ],
  },
  returns: {
    slug: "returns",
    eyebrow: "အကူအညီ",
    title: "ပြန်အမ်းခြင်းနှင့် ငွေပြန်အမ်းခြင်း",
    lead: "ပစ္စည်း တိုင်းကို အော်ဒါ တစ်ခုအတွက် ရိုက်နှိပ်တာမို့ ပြန်အမ်းခြင်းက ကျွန်ုပ်တို့၏ အမှားများအတွက်သာ ဖြစ်ပြီး စိတ်ပြောင်းလဲမှုအတွက် မဟုတ်ပါ။",
    sections: [
      {
        heading: "ဘာတွေ ပါဝင်သလဲ",
        bullets: [
          "မှားရိုက်ခြင်း၊ ကျွန်ုပ်တို့ ပို့လိုက်သည့် အရောင် သို့မဟုတ် ဆိုဒ် မှားခြင်း သို့မဟုတ် သင့်ထံ မရောက်မီ ဖြစ်ပွားသည့် ပျက်စီးမှု။",
          "အထုပ် ဖွင့်သည်နှင့် အမြန် အကြောင်းကြားပါ။ ပစ္စည်း၏ ဓာတ်ပုံ ပါလျှင် ပိုမြန်စွာ ပြင်ပေးနိုင်သည်။",
        ],
      },
      {
        heading: "ဘာတွေ မပါဝင်သလဲ",
        bullets: [
          "စိတ်ပြောင်းလဲမှု၊ သို့မဟုတ် မှာယူသည့် ဆိုဒ်နှင့် ကိုက်ညီသည့် ဆိုဒ်ကို ရွေးမိခြင်း။",
          "သင် အသုံးပြုခွင့် မရှိသည့် အကြောင်းအရာ ပါဝင်သော ပန်းချီ။",
        ],
      },
      {
        heading: "မည်သို့ တင်ပြရမလဲ",
        body: [
          "သင့် အကောင့်ကို ဖွင့်ပြီး အော်ဒါ မှတ်တမ်းကို ရွေးကာ အော်ဒါပေါ်ရှိ ငွေပြန်အမ်းရန် တောင်းဆိုခြင်း ကို နှိပ်ပါ — ဘာ မှားသွားသည်ကို ရွေးပြီး ဖြစ်ပျက်ပုံကို ရေးပါ။ ပရင့် ကောင်တာက အလုပ်ရက် တစ်ရက်အတွင်း ပြန်ကြားသည်။",
          "စာရေးလိုလျှင် ဆက်သွယ်ရန် စာမျက်နှာတွင် အော်ဒါနံပါတ်နှင့် ဓာတ်ပုံ ထည့်ပြီး ရေးပါ။ အမှားကို တွေ့မြင်ပြီးသည်နှင့် ပြန်ရိုက်ပေးသည် သို့မဟုတ် ငွေ ပြန်အမ်းပေးသည်။ မည်သို့ဖြစ်စေ အော်ဒါ၏ မှတ်တမ်းက ကျန်ရှိသည်။",
        ],
      },
      {
        heading: "မူပိုင်ခွင့် တိုင်ကြားချက်များ",
        body: [
          "ပန်းချီ ကိုယ်တိုင်နှင့် ပတ်သက်သည့် တိုင်ကြားချက်ကို ပြန်အမ်းခြင်း မဟုတ်ဘဲ ဖယ်ရှားခြင်းအဖြစ် ကိုင်တွယ်သည် — MH Fashion က တိုင်ကြားချက်ကို လက်ခံပြီး ထို ဒီဇိုင်းကို ဖျောက်ထားသည်။ ငွေ ပေးပြီးသား အော်ဒါကိုမူ ဆက်လက် ထုတ်လုပ် ပို့ဆောင်ရန် ချန်ထားသည်။",
        ],
      },
    ],
  },
  "size-guide": {
    slug: "size-guide",
    eyebrow: "အကူအညီ",
    title: "ဆိုဒ် လမ်းညွှန်",
    lead: "တစ်ခါ တိုင်းပြီး ထုတ်ကုန်၏ ကိုယ်ပိုင် ဆိုဒ် စာရင်းနှင့် ယှဉ်ပါ။",
    sections: [
      {
        heading: "မည်သို့ တိုင်းရမလဲ",
        bullets: [
          "ရင်ဘတ် — အပြည့်ဆုံး နေရာကို ပတ်တိုင်းပါ။ တိပ်ကို လက်မောင်းအောက်တွင် အပြိုင်ထားပါ။",
          "အလျား — ပခုံး၏ အမြင့်ဆုံး အမှတ်မှ အောက်ခြေ အနားအထိ တည့်တည့် တိုင်းပါ။",
          "လက်စွပ် — ပခုံး ချုပ်ရိုးမှ လက်စွပ် အဆုံးအထိ၊ လက်ကို လျော့ထားပြီး တိုင်းပါ။",
          "သင် နှစ်သက်ပြီးသား အင်္ကျီ တစ်ထည်ကို ပြားပြားခင်းပြီး တိုင်းပါ။ ကိုယ်ကို တိုင်းတာသည်ထက် ပို ယုံကြည်စိတ်ချရသည်။",
        ],
      },
      {
        heading: "ဆိုဒ် ရွေးချယ်ခြင်း",
        body: [
          "ထုတ်ကုန် စာမျက်နှာ တစ်ခုစီတွင် ထုတ်လုပ်သည့် ဆိုဒ်များ ပြထားပြီး ဖစ် (ပုံမှန်၊ ပိုကျယ်) သည် ထုတ်ကုန်၏ အစိတ်အပိုင်း ဖြစ်သည် — ပိုကျယ်သည့် ဖစ်သည် တူညီသည့် ဆိုဒ် တံဆိပ်တွင် ပုံမှန် ဖစ်ထက် ပိုကျယ်စွာ ဝတ်ရသည်။ ဖစ်ကို အရင် ရွေးပါ၊ ပြီးမှ ဆိုဒ် ရွေးပါ။",
        ],
      },
      {
        heading: "ရိုက်နှိပ် ဧရိယာ",
        body: [
          "ရိုက်နှိပ် ဧရိယာသည် အထည်ထက် သေးပြီး အယ်ဒီတာက ပန်းချီကို ထို ဧရိယာအတွင်း ထိန်းထားတာမို့ ချုပ်ရိုးထဲ မထိုးဝင်ပါ။ တူညီသည့် ဧရိယာကို ပရင့် ဖိုင်နှင့် အစမ်းမြင်ကွင်း နှစ်ခုလုံးအတွက် သုံးသည်။",
        ],
      },
    ],
  },
};

export const INFO_PAGES: Record<string, InfoPage> = {
  about: {
    slug: "about",
    eyebrow: "About us",
    title: "MH Fashion",
    lead: "A Myanmar print studio: you design it online, we print it and deliver it.",
    sections: [
      {
        heading: "What we make",
        body: [
          "MH Fashion prints custom apparel and accessories — T-shirts, hoodies, polos, football jerseys, caps, phone covers, pillow cases and sling bags. You choose the product, the colour, the fabric and the print method, then design the artwork in the editor.",
          "Our MH Sport line covers football jerseys with per-panel artwork. The Nyein line is ready-made: it is sold exactly as shown, without the editor.",
        ],
      },
      {
        heading: "How it works",
        bullets: [
          "Design on the product page, or pick a ready-made design.",
          "Pay with KBZPay, Wave Pay, AYA Pay or a card. The order is confirmed once the payment completes.",
          "We print the order, hand it to the courier and keep the status visible on your order.",
        ],
      },
      {
        heading: "Your artwork stays yours",
        body: [
          "You keep the rights to the designs you upload. You give MH Fashion the right to advertise and sell the design on the products you ordered; you stay responsible for holding those rights.",
        ],
      },
    ],
  },

  faq: {
    slug: "faq",
    eyebrow: "Help",
    title: "Frequently asked questions",
    lead: "Payment, printing, delivery and what happens when someone claims a design.",
    sections: [
      {
        heading: "How can I pay?",
        body: [
          "KBZPay, Wave Pay, AYA Pay, or Visa and Mastercard. Cash on delivery is not offered, and an order is not confirmed until the payment completes.",
        ],
      },
      {
        heading: "When does my order get printed?",
        body: [
          "Once the payment confirms, the order moves through Confirmed, Processing, Printing, Ready to Ship, Handed to Delivery, Out for Delivery and Delivered. The stage is shown on your order.",
        ],
      },
      {
        heading: "How much is delivery?",
        body: [
          "MH Delivery prices the parcel for the address you enter, and the quote depends on the items and their weight. We do not add a fee of our own, and we never show a guessed number — the quote is added to the receipt when it arrives.",
        ],
      },
      {
        heading: "Can I return an item?",
        body: [
          "Because every piece is printed for you, a refund is offered for our production errors — a misprint, the wrong item, or damage in transit. Change of mind is not covered. See Returns for how to report one.",
        ],
      },
      {
        heading: "Who owns the design I upload?",
        body: [
          "You do. You grant MH Fashion the right to advertise and sell it on the products you order, and you are responsible for holding the rights to it. If someone claims a design, MH Fashion accepts the claim and takes the design down from the shop; an order that is already paid is still produced and delivered.",
        ],
      },
      {
        heading: "Which size should I pick?",
        body: [
          "Each product page lists its own sizes, and the fit (regular, oversized) is part of the product. The size guide explains how to measure so the number you pick is the number you want.",
        ],
      },
    ],
  },

  shipping: {
    slug: "shipping",
    eyebrow: "Help",
    title: "Shipping and delivery",
    lead: "Domestic delivery runs through MH Delivery; international delivery is planned with DHL.",
    sections: [
      {
        heading: "Who delivers",
        bullets: [
          "Myanmar: MH Delivery, door to door.",
          "International: DHL, once the international option opens.",
        ],
      },
      {
        heading: "How the fee works",
        body: [
          "MH Delivery prices the parcel from its contents and the address. You pay MH Fashion, and MH Fashion settles with the courier separately — so the price you see is the courier's price, not a marked-up guess.",
        ],
      },
      {
        heading: "Where we deliver",
        body: [
          "Enter the township and the city or region at checkout. The courier calls the phone number you give us, so a reachable number matters more than a long address.",
        ],
      },
      {
        heading: "Tracking",
        body: [
          "The order status is the tracking: Handed to Delivery, Out for Delivery and Delivered are the courier's own steps.",
        ],
      },
    ],
  },

  returns: {
    slug: "returns",
    eyebrow: "Help",
    title: "Returns and refunds",
    lead: "Every piece is printed for one order, so returns cover our mistakes, not a change of mind.",
    sections: [
      {
        heading: "What is covered",
        bullets: [
          "A misprint, a wrong colour or size that we sent, or damage that happened before it reached you.",
          "Tell us as soon as you open the parcel; a photo of the item helps us fix it faster.",
        ],
      },
      {
        heading: "What is not covered",
        bullets: [
          "A change of mind, or a size you picked that matches the size you ordered.",
          "Artwork that contains content you did not have the right to use.",
        ],
      },
      {
        heading: "How to report it",
        body: [
          "Open your account, choose Order History and press Request a refund on the order: pick what went wrong, say what happened, and the print desk answers within one working day.",
          "If you would rather write, use the contact page with the order number and a photo. We reprint or refund once we can see the fault; the order keeps its record either way.",
        ],
      },
      {
        heading: "Copyright claims",
        body: [
          "A claim about the artwork itself is handled as a takedown, not a return: MH Fashion accepts the claim, hides the design, and leaves an order that is already paid to be produced and delivered.",
        ],
      },
    ],
  },

  "size-guide": {
    slug: "size-guide",
    eyebrow: "Help",
    title: "Size guide",
    lead: "Measure once, then match the number to the product's own size list.",
    sections: [
      {
        heading: "How to measure",
        bullets: [
          "Chest: measure around the fullest part, keeping the tape level under the arms.",
          "Length: from the highest point of the shoulder straight down to the hem.",
          "Sleeve: from the shoulder seam to the sleeve end, with the arm relaxed.",
          "Use a shirt you already like and lay it flat; that is more reliable than measuring yourself.",
        ],
      },
      {
        heading: "Choosing the size",
        body: [
          "Each product page lists the sizes it is made in, and the fit is part of the product — an oversized fit is meant to sit wider than a regular one at the same label size. Pick the fit first, then the size.",
        ],
      },
      {
        heading: "Print area",
        body: [
          "The print area is smaller than the garment, and the editor keeps the artwork inside it so nothing runs into a seam. The same area is used for the press file and the preview.",
        ],
      },
    ],
  },

  terms: {
    slug: "terms",
    eyebrow: "Legal",
    title: "Terms of Use",
    lead: "The rules for ordering from MH Fashion and for the designs you upload.",
    draft: "Draft for legal review. The wording follows the owner's policy decisions but has not been reviewed by a lawyer.",
    sections: [
      {
        heading: "Orders and prices",
        bullets: [
          "Prices are set in Myanmar Kyat. The USD figure is a display conversion at a fixed rate set by the shop.",
          "An order is confirmed only after the payment completes; there is no cash on delivery.",
          "The delivery fee is the courier's quote for your parcel and is added to the order when it arrives.",
        ],
      },
      {
        heading: "Your designs",
        bullets: [
          "You keep the rights to the designs you upload.",
          "You grant MH Fashion the right to advertise and sell the design on the products you order.",
          "You are responsible for holding the rights to what you submit.",
        ],
      },
      {
        heading: "Takedowns",
        body: [
          "If someone says a design is theirs, MH Fashion accepts the claim and takes the design down — it is hidden or removed from the shop and from the editor. An order that is already paid is produced and delivered as normal; the takedown only stops new sales of that design.",
          "Claims are received through the contact page and recorded with the claimant, the date and the admin who handled it.",
        ],
      },
      {
        heading: "Production and delivery",
        bullets: [
          "We print the order after the payment confirms, and hand it to the courier named on the shipping page.",
          "A refund is offered for our production errors, not for a change of mind.",
        ],
      },
      {
        heading: "Changes",
        body: ["These terms may change as the shop grows; the version shown here applies to an order when it is placed."],
      },
    ],
  },

  privacy: {
    slug: "privacy",
    eyebrow: "Legal",
    title: "Privacy Policy",
    lead: "What MH Fashion keeps, why it keeps it, and what stays in your own browser.",
    draft: "Draft for legal review. It describes what the shop does today.",
    sections: [
      {
        heading: "What stays in your browser",
        bullets: [
          "Your cart is stored in this browser, not on our servers, so it survives a refresh and nothing is sent until you place the order.",
          "The checkout keeps a single request key in the browser session so a double submit cannot create a second order.",
        ],
      },
      {
        heading: "What an order collects",
        bullets: [
          "The recipient's name, phone number, address, township and city — the courier needs them to deliver.",
          "An optional note for the print desk, and the items with their size, colour and price.",
        ],
      },
      {
        heading: "Who sees it",
        bullets: [
          "The MH Fashion team, to print and pack the order.",
          "The courier (MH Delivery, or DHL for international), to deliver it.",
          "Nobody else. We do not sell contact details and we do not run advertising trackers.",
        ],
      },
      {
        heading: "Asking about your data",
        body: ["Write to us through the contact page and we will tell you what we hold for an order, or correct it."],
      },
    ],
  },

  "cookie-policy": {
    slug: "cookie-policy",
    eyebrow: "Legal",
    title: "Cookie Policy",
    lead: "No advertising cookies. The shop uses your browser's local storage for the cart.",
    draft: "Draft for legal review. It describes what the shop does today.",
    sections: [
      {
        heading: "Advertising cookies",
        body: ["There are none. No third-party ad or analytics script sets a cookie on this shop today."],
      },
      {
        heading: "What the browser stores",
        bullets: [
          "mh-fashion-cart-items — the items in your cart.",
          "mh-fashion-checkout-key — the request key for the checkout you are in the middle of.",
          "Admin preview data is stored the same way, and only on a device that signed into the admin preview.",
        ],
      },
      {
        heading: "Clearing it",
        body: ["Clearing this site's data in your browser removes the cart and the checkout key. An order that was already placed is unaffected."],
      },
    ],
  },
};

export const INFO_PAGE_SLUGS = Object.keys(INFO_PAGES);
