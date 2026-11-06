import type { GuideCatalog } from "./guides";

const PUBLISHED_AT = "2026-01-01T00:00:00.000Z";

export const GUIDE_STARTER_CATALOG: GuideCatalog = {
  source: "starter",
  categories: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      slug: "product-guide",
      name: "Product Guide",
      description:
        "Learn how MH Fashion products, attributes, customization levels, and pricing choices fit together.",
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      slug: "design-guide",
      name: "Design Guide",
      description:
        "Learn the planned editor, preview, mockup, and design workflow.",
    },
    {
      id: "10000000-0000-4000-8000-000000000003",
      slug: "payment-guide",
      name: "Payment Guide",
      description:
        "Understand the planned checkout choices and payment-provider flow.",
    },
    {
      id: "10000000-0000-4000-8000-000000000004",
      slug: "delivery-guide",
      name: "Delivery Guide",
      description:
        "Understand the planned delivery providers, fees, and order statuses.",
    },
  ],
  posts: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      slug: "how-mh-fashion-products-are-organized",
      categorySlug: "product-guide",
      title: "How MH Fashion products are organized",
      excerpt:
        "The product catalog is built around product, style, and color, with customization rules that vary by item.",
      sections: [
        {
          heading: "Start with the product",
          paragraphs: [
            "MH Fashion plans to offer customizable and fixed-design products. The top-level selector is Product, with examples such as T-shirt, Streetwear, Hoodie, Cup, and Phone Cover.",
          ],
          bullets: [
            "Full customization lets the user edit the design.",
            "No customization keeps the design fixed.",
            "Partial customization uses a locked base template with selected overlay fields editable.",
          ],
        },
        {
          heading: "Pricing follows the selection",
          paragraphs: [
            "Price depends on the full attribute combination rather than a flat product price. A Super Admin sets prices in the Pricing Management module, so a product card can show a range and the detail page can show the exact price after the full combination is chosen.",
          ],
        },
      ],
      readingMinutes: 2,
      featured: true,
      publishedAt: PUBLISHED_AT,
      seoTitle: "MH Fashion product and customization guide",
      seoDescription:
        "Understand MH Fashion product types, customization levels, attribute choices, and how planned pricing is determined.",
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      slug: "how-apparel-options-narrow-down",
      categorySlug: "product-guide",
      title: "How apparel options narrow down",
      excerpt:
        "The apparel selector uses cascading attributes so each choice keeps the later options relevant.",
      sections: [
        {
          heading: "Follow the selection chain",
          paragraphs: [
            "For T-shirts, Hoodies, and Streetwear, the planned selection chain is Product → Print Method → Fabric Type → Knit/Fabric Structure → GSM → Color → MH Cuttings → Size.",
          ],
          bullets: [
            "Print Method includes DTF and Sublimation.",
            "Fabric Type includes Combed Cotton, Compact Combed Cotton, and Polyester.",
            "Knit/Fabric Structure includes Single Jersey, Interlock, and Air Layer.",
            "GSM is an admin-managed preset list.",
          ],
        },
        {
          heading: "Cascading keeps choices relevant",
          paragraphs: [
            "Earlier choices filter every later attribute. For example, Sublimation can narrow Fabric Type to Polyester and narrow Knit Structure and GSM options too. Unavailable options are hidden, not greyed out. Color, Cutting, and Size are not filtered.",
            "The planned size guide shows weight and height ranges for adult sizes and age ranges for kids sizes; the plan does not prescribe specific measurements here.",
          ],
        },
      ],
      readingMinutes: 2,
      featured: false,
      publishedAt: PUBLISHED_AT,
      seoTitle: "MH Fashion apparel options and attribute guide",
      seoDescription:
        "See how print method, fabric, knit structure, GSM, color, cutting, and size choices are planned to work together.",
    },
    {
      id: "20000000-0000-4000-8000-000000000003",
      slug: "the-planned-editor-flow",
      categorySlug: "design-guide",
      title: "The planned editor flow",
      excerpt:
        "The planned create flow gives designers separate Front and Back canvases, tools, layers, and a final mockup check.",
      sections: [
        {
          heading: "Build on two canvases",
          paragraphs: [
            "The planned /create editor places Upload, Elements, Text, Effects, and AI in a left rail, with a tools palette below it and a layers panel on the right. Front and Back canvases sit side by side on a transparent background, with the attribute bar along the bottom.",
          ],
        },
        {
          heading: "Finish before ordering",
          paragraphs: [
            "The top bar is planned to include Undo, Redo, live price, Save, Add to Cart, and Buy Now. Add to Cart and Buy Now stay disabled until the mockup is attached, and Save is intended to happen after the full flow completes.",
            "These are planned product behaviors from the project plan, not a claim that every editor feature or integration is live today. Terms acceptance and a watermark are also part of the planned first-use flow.",
          ],
        },
      ],
      readingMinutes: 2,
      featured: true,
      publishedAt: PUBLISHED_AT,
      seoTitle: "MH Fashion custom design editor guide",
      seoDescription:
        "Learn the planned MH Fashion editor layout, Front and Back canvases, design tools, layers, and mockup check.",
    },
    {
      id: "20000000-0000-4000-8000-000000000004",
      slug: "how-previews-and-mockups-are-planned",
      categorySlug: "design-guide",
      title: "How previews and mockups are planned",
      excerpt:
        "The preview plan combines a product mockup with a design overlay while keeping Front and Back artwork separate.",
      sections: [
        {
          heading: "Three layers make the preview",
          paragraphs: [
            "A planned preview has three layers: background, product mockup, and design SVG overlay. Grayscale recolor uses one base image per style and angle, so choosing a color can update the main image without requiring a separate photo for every color.",
          ],
          bullets: [
            "Front artwork appears only on the Front mockup.",
            "Back artwork appears only on the Back mockup.",
            "Detail shots show fabric close-ups without a design overlay.",
          ],
        },
        {
          heading: "Attach the design to the product",
          paragraphs: [
            "Mockup attach is planned to copy Front placement proportionally to Back only when the print-area types match. Original admin SVGs remain immutable; Edit Design creates the user's own copy.",
            "The preview and attachment rules describe the intended product behavior and may evolve as implementation continues.",
          ],
        },
      ],
      readingMinutes: 2,
      featured: false,
      publishedAt: PUBLISHED_AT,
      seoTitle: "MH Fashion preview and mockup guide",
      seoDescription:
        "Understand the planned MH Fashion preview layers, recolor approach, Front and Back artwork, and mockup attachment rules.",
    },
    {
      id: "20000000-0000-4000-8000-000000000005",
      slug: "payment-options-at-checkout",
      categorySlug: "payment-guide",
      title: "Payment options at checkout",
      excerpt:
        "The planned checkout supports card and Myanmar payment choices through a Payment Provider interface.",
      sections: [
        {
          heading: "Planned provider choices",
          paragraphs: [
            "The commerce plan lists Visa, KBZPay, Wave Pay, and AYA Pay behind a Payment Provider interface. Cash on delivery is not part of the plan, and payment must complete before an order confirms.",
          ],
          bullets: [
            "Checkout is planned to auto-detect the provider.",
            "The user chooses a payment option before confirming the order.",
            "An order remains in Pending Payment until payment is complete.",
          ],
        },
        {
          heading: "What checkout summarizes",
          paragraphs: [
            "The planned checkout includes an address from the account, provider detection, payment choice, order summary, and terms. Gateway API details remain deferred, so this article explains the intended workflow rather than claiming that a payment integration is live.",
          ],
        },
      ],
      readingMinutes: 2,
      featured: true,
      publishedAt: PUBLISHED_AT,
      seoTitle: "MH Fashion payment and checkout guide",
      seoDescription:
        "Understand the planned Visa and Myanmar payment choices, provider interface, and payment-first checkout workflow.",
    },
    {
      id: "20000000-0000-4000-8000-000000000006",
      slug: "what-payment-means-for-order-status",
      categorySlug: "payment-guide",
      title: "What payment means for order status",
      excerpt:
        "Payment is planned as the first gate in MH Fashion's order workflow, before confirmation and production stages.",
      sections: [
        {
          heading: "Payment comes first",
          paragraphs: [
            "The planned order workflow starts at Pending Payment. After payment completes, an order can move to Confirmed and then through Processing, Printing, Ready to Ship, Handed to Delivery, Out for Delivery, and Delivered.",
          ],
          bullets: [
            "Cancelled and Refunded are additional planned outcomes.",
            "Payment must complete before the order confirms.",
            "The status names belong to MH Fashion's own workflow.",
          ],
        },
        {
          heading: "A plan, not a live promise",
          paragraphs: [
            "Provider behavior and gateway API details are still deferred in the project plan. Use the live checkout and order status shown by MH Fashion when those flows are available; this guide does not promise a particular processing time.",
          ],
        },
      ],
      readingMinutes: 2,
      featured: false,
      publishedAt: PUBLISHED_AT,
      seoTitle: "MH Fashion payment and order status guide",
      seoDescription:
        "See how the planned payment-first flow connects to MH Fashion order confirmation and production statuses.",
    },
    {
      id: "20000000-0000-4000-8000-000000000007",
      slug: "how-delivery-fees-are-planned",
      categorySlug: "delivery-guide",
      title: "How delivery fees are planned",
      excerpt:
        "The delivery plan separates domestic and international providers while keeping the customer payment with MH Fashion.",
      sections: [
        {
          heading: "Two planned delivery providers",
          paragraphs: [
            "The commerce plan lists MH Delivery for domestic delivery and DHL for international delivery. Both sit behind a Delivery Provider interface, so the provider choice can be adjusted as the platform develops.",
          ],
        },
        {
          heading: "Fee and settlement flow",
          paragraphs: [
            "The delivery fee is planned to be calculated from the moment an item is added to the cart and combined with the product total. The user pays MH Fashion, and MH Fashion settles with the courier separately through a Delivery Settlement Report in admin.",
            "The plan does not define a delivery-time SLA or fixed shipping amount. Live availability and quotes should come from the checkout flow when delivery integration is available.",
          ],
        },
      ],
      readingMinutes: 2,
      featured: true,
      publishedAt: PUBLISHED_AT,
      seoTitle: "MH Fashion delivery fee and provider guide",
      seoDescription:
        "Understand the planned MH Delivery and DHL provider flow, delivery fee timing, and courier settlement model.",
    },
    {
      id: "20000000-0000-4000-8000-000000000008",
      slug: "order-status-and-delivery-handoff",
      categorySlug: "delivery-guide",
      title: "Order status and delivery handoff",
      excerpt:
        "The planned status timeline shows when an order moves from production into delivery and final handoff.",
      sections: [
        {
          heading: "Follow the planned timeline",
          paragraphs: [
            "After payment and confirmation, the planned MH Fashion workflow moves through production and delivery stages in this order:",
          ],
          bullets: [
            "Pending Payment → Confirmed → Processing → Printing",
            "Ready to Ship → Handed to Delivery → Out for Delivery → Delivered",
            "Cancelled and Refunded are separate planned outcomes.",
          ],
        },
        {
          heading: "What the labels do not promise",
          paragraphs: [
            "Handed to Delivery, Out for Delivery, and Delivered are planned status labels, not a delivery-time guarantee. Stages may be adjusted later, and this guide does not invent a shipping SLA.",
          ],
        },
      ],
      readingMinutes: 2,
      featured: false,
      publishedAt: PUBLISHED_AT,
      seoTitle: "MH Fashion order status and delivery guide",
      seoDescription:
        "Read the planned MH Fashion order timeline from payment through production, delivery handoff, and delivery completion.",
    },
  ],
};
