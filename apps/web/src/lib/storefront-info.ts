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

export const CONTACT_EMAIL = (process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@mhfashion.com").trim();

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
