import type { GuideCatalog } from "./guides";

const PUBLISHED_AT = "2026-01-01T00:00:00.000Z";

export const GUIDE_STARTER_CATALOG: GuideCatalog = {
  source: "starter",
  categories: [
    {
      id: "10000000-0000-4000-8000-000000000005",
      slug: "editor-guide",
      name: "Editor Guide",
      description:
        "Learn the editor step by step: the tools, layers, text, and how to export a print-ready design.",
    },
    {
      id: "10000000-0000-4000-8000-000000000006",
      slug: "size-guide",
      name: "Size Guide",
      description:
        "Choose the right size: how to measure, how to read the chart, and how a size should fit.",
    },
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
        "Learn the editor, the preview, the mockup and the design workflow.",
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
      id: "20000000-0000-4000-8000-000000000003",
      slug: "editor-guide",
      categorySlug: "editor-guide",
      title: "Editor Guide: make your first print",
      excerpt:
        "Open the editor, draw and type on the print canvas, arrange the layers, then check the mockup before you order.",
      sections: [
        {
          heading: "Open the editor",
          paragraphs: [
            "Pick Create in the menu, or the Create tab on a phone. The editor fills the screen: the shop header, then the bar that carries the Product, GSM, Color and Size choices, then the print canvas with the tools on the left, the layers panel beside it and the front and back mockups.",
            "The print canvas is the area that gets printed, so anything you draw there is at real print size.",
          ],
        },
        {
          heading: "Draw, type and add images",
          paragraphs: [
            "The tools run down the left side: Move, Hand, Pencil, Pen, Text, Brush, Eraser, Shapes and Gradient. Pick Text and click the canvas to type; a long line wraps to the print width, Enter starts a new line and the caret keeps following you down the page.",
            "Photos and logos go in as PNG, JPG or SVG up to 2 MB. A large photo is resized to 2000 pixels on its longest edge, so it still prints sharply at the sizes a shirt allows.",
          ],
        },
        {
          heading: "Arrange the layers",
          paragraphs: [
            "Every element is a layer in the Layers panel: reorder them, hide one to see what is behind it, or lock one so a drag cannot move it. Blend mode, opacity and fill sit at the top of the panel.",
            "The free transform box moves, resizes and rotates the selected layer. Drag a corner or edge handle to resize, hold Shift to stretch freely, hold Alt to scale from the centre, and hold Shift while rotating to snap to 15-degree steps.",
          ],
        },
        {
          heading: "Check the mockup",
          paragraphs: [
            "The front and back mockups show where the print sits on the garment. Artwork you park outside the print canvas is clipped there, and the print desk is warned about it when the order is packed, so keep the design inside the canvas.",
          ],
        },
        {
          heading: "Keep your work and order it",
          paragraphs: [
            "The editor saves your draft in this browser about half a second after each change, so a refresh does not lose the design. The Save and Buy boxes on the editor bar are not connected yet: open the product page to see the design on the product and place the order there.",
            "The print desk receives the artwork as an SVG at real print size, together with the layer measurements and a quality check.",
          ],
        },
      ],
      readingMinutes: 4,
      featured: true,
      publishedAt: PUBLISHED_AT,
      seoTitle: "MH Fashion editor guide — draw, arrange and print",
      productLinks: [],
      seoDescription:
        "A walkthrough of the MH Fashion editor: the print canvas, drawing and text tools, the layers panel, the free transform box, the mockups, and how a design reaches the print desk.",
    },
    {
      id: "20000000-0000-4000-8000-000000000012",
      slug: "how-the-editor-works",
      categorySlug: "editor-guide",
      title: "How the editor works: tools, layers and export",
      excerpt:
        "Pick a garment, open the editor, draw or upload artwork on its own layer, then export a print-ready file.",
      sections: [
        {
          heading: "The four parts of the screen",
          paragraphs: [
            "The tools bar holds the brush, pencil, pen, shape, text, gradient and eraser. The print canvas in the middle is the area that actually prints. The layers panel lists everything on the design, and the mockup shows the garment with your artwork on it.",
            "Nothing you draw goes straight onto the garment: every mark lands on the selected layer, so you can move, hide or delete it later without touching the rest.",
          ],
          bullets: [
            "Choose the garment and colour first, then open the editor.",
            "Draw inside the white print area; anything outside it is not printed.",
            "Watch the mockup: it shows what the finished garment will look like.",
          ],
        },
        {
          heading: "Layers keep the design editable",
          paragraphs: [
            "Each text block, shape, pen path, photo and brush stroke can sit on its own layer. Use one layer per idea, name it, and lock the ones you are happy with so a later drag cannot move them by accident.",
            "Group layers that belong together, and reorder them when one needs to sit above another. A layer hidden in the panel is hidden in the print file too.",
          ],
        },
        {
          heading: "Export and print quality",
          paragraphs: [
            "The editor warns when a photo is too small for the print area, because a stretched photo prints soft. Keep photos at or above the size the warning asks for.",
            "Export the design when it looks right on the mockup. The exported file carries the layers at print resolution, which is what the shop prints from.",
          ],
        },
      ],
      readingMinutes: 4,
      featured: true,
      publishedAt: PUBLISHED_AT,
      seoTitle: "MH Fashion editor guide: tools, layers and print export",
      productLinks: [],
      seoDescription:
        "A walk through the MH Fashion editor: the tools bar, the print canvas, layers and the mockup, and how to export a print-ready design.",
    },
    {
      id: "20000000-0000-4000-8000-000000000011",
      slug: "how-to-read-the-size-guide",
      categorySlug: "size-guide",
      title: "How to read the size guide",
      excerpt:
        "Measure the garment you already wear, compare it with the chart, and pick the size that matches — not the size on the label.",
      sections: [
        {
          heading: "Start from a garment you already like",
          paragraphs: [
            "Lay the garment flat, button or zip it, and smooth out the wrinkles. A flat measurement is easier to repeat than a body measurement, and it is what the chart records.",
            "Measure chest one inch below the armhole, length from the highest point of the shoulder to the hem, and sleeve from the shoulder seam to the cuff. Write the three numbers down in centimetres.",
          ],
          bullets: [
            "Chest is measured across the front only, then doubled, or straight across as the chart states.",
            "Keep the tape level and snug, never pulled tight.",
            "Measure twice; a one-centimetre slip changes the size.",
          ],
        },
        {
          heading: "Compare with the chart, then choose",
          paragraphs: [
            "The chart lists garment measurements for each size, so match your numbers to the closest row rather than to the size printed on an old label. Sizes differ between suppliers.",
            "When two sizes are both close, choose the larger one for a relaxed fit and the smaller one for a closer fit. Knit fabrics give a little; woven fabrics do not.",
          ],
        },
        {
          heading: "Ask before you order",
          paragraphs: [
            "If a measurement sits between two rows, message the shop with your numbers and the product link before ordering. A wrong size costs more to fix than a short question.",
          ],
        },
      ],
      readingMinutes: 3,
      featured: false,
      publishedAt: PUBLISHED_AT,
      seoTitle: "MH Fashion size guide: how to measure and choose a size",
      productLinks: [],
      seoDescription:
        "Measure a garment you already wear, compare it with the MH Fashion size chart, and choose the right size for a relaxed or closer fit.",
    },
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
      productLinks: [],
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
      productLinks: [],
      seoDescription:
        "See how print method, fabric, knit structure, GSM, color, cutting, and size choices are planned to work together.",
    },
    {
      id: "20000000-0000-4000-8000-000000000013",
      slug: "print-methods-and-how-to-care-for-a-print",
      categorySlug: "product-guide",
      title: "Print methods and how to care for a print",
      excerpt:
        "Direct-to-garment, vinyl and embroidery each suit different artwork. Wash the garment inside out and the print keeps its colour.",
      sections: [
        {
          heading: "Which method suits which artwork",
          paragraphs: [
            "Direct-to-garment printing sprays ink into the fabric, so it handles photographs, gradients and many colours without extra cost. It sits best on cotton and cotton blends.",
            "Vinyl is cut from a coloured sheet, so it suits solid shapes, names and numbers in one or two colours and holds sharp edges on polyester sportswear. Embroidery stitches the artwork in thread, which suits logos and small chest marks rather than fine detail.",
          ],
          bullets: [
            "Photos and gradients: direct-to-garment.",
            "Bold one-colour shapes and lettering: vinyl.",
            "Logos and small marks: embroidery.",
          ],
        },
        {
          heading: "Care that keeps the print",
          paragraphs: [
            "Turn the garment inside out, wash cold on a gentle cycle, and skip fabric softener and bleach. Tumble dry low or hang it to dry; a hot dryer is what cracks a print first.",
            "Iron the reverse side only, never straight onto the print, and do not dry-clean a printed garment.",
          ],
        },
      ],
      readingMinutes: 3,
      featured: false,
      publishedAt: PUBLISHED_AT,
      seoTitle: "MH Fashion print methods and print care",
      productLinks: [],
      seoDescription:
        "How direct-to-garment, vinyl and embroidery differ, which artwork suits each, and how to wash and iron a printed garment so the print lasts.",
    },
    {
      id: "20000000-0000-4000-8000-000000000014",
      slug: "how-to-place-an-order-step-by-step",
      categorySlug: "product-guide",
      title: "How to place an order, step by step",
      excerpt:
        "Pick the product and its options, design it, check the mockup and the size, add it to the cart and confirm the delivery details.",
      sections: [
        {
          heading: "From product to cart",
          paragraphs: [
            "Choose the product, then narrow it down with the options the shop offers, such as colour and size. The price updates as the options change, so the number you see is the number for that combination.",
            "Open the editor, finish the design, and check the mockup before adding it to the cart. If you are unsure about the size, read the size guide and measure a garment you already wear.",
          ],
          bullets: [
            "One design per cart line; duplicate the line if you want two sizes of the same design.",
            "Check the print area on the mockup, not only on the canvas.",
            "Keep the design saved so you can order it again later.",
          ],
        },
        {
          heading: "Delivery and confirmation",
          paragraphs: [
            "Enter the delivery address and phone number carefully, then confirm the order. The shop sends the order number, and that number is what to quote in any message about the order.",
            "If a detail is wrong, message the shop with the order number as soon as possible; an order that has already gone to print cannot be changed.",
          ],
        },
      ],
      readingMinutes: 3,
      featured: false,
      publishedAt: PUBLISHED_AT,
      seoTitle: "How to place an MH Fashion order",
      productLinks: [],
      seoDescription:
        "The MH Fashion ordering steps: choose product and options, design it, check the mockup and size, add to cart, confirm delivery details and keep the order number.",
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
      productLinks: [],
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
      productLinks: [],
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
      productLinks: [],
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
      productLinks: [],
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
      productLinks: [],
      seoDescription:
        "Read the planned MH Fashion order timeline from payment through production, delivery handoff, and delivery completion.",
    },
  ],
};
