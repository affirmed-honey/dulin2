const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const products = [
    {
      slug: "wavy-teddy-mirror",
      name: "Wavy Teddy Mirror",
      category: "Bedroom Items",
      price: 60000, // cents
      image: "img/Mirror 1.jpeg",
      images: ["img/Mirror 1.jpeg"],
      description: "Stylish wavy teddy mirror for modern bedrooms.",
      stock: 20,
    },
    {
      slug: "electric-kettle",
      name: "Electric Kettle",
      category: "Kitchen",
      price: 29900,
      image: "img/kettle1-removebg-preview.png",
      images: ["img/kettle1-removebg-preview.png"],
      description: "Fast-boil electric kettle with auto shutoff.",
      stock: 50,
    },
    {
      slug: "decorative-ornament",
      name: "Decorative Ornament",
      category: "Ornaments",
      price: 51900,
      image: "img/ornanent1.jpg",
      images: ["img/ornanent1.jpg"],
      description: "Minimalist decorative ornament for living spaces.",
      stock: 35,
    },
    {
      slug: "office-lamp",
      name: "Office Lamp",
      category: "Lamps",
      price: 92100,
      image: "img/lamp1.jpg",
      images: ["img/lamp1.jpg"],
      description: "Adjustable office lamp with warm light.",
      stock: 15,
    },
    {
      slug: "flower-vase",
      name: "Flower Vase",
      category: "Decoration",
      price: 8900,
      image: "img/flowervase3.jpg",
      images: ["img/flowervase3.jpg"],
      description: "Elegant glass flower vase.",
      stock: 60,
    },
    {
      slug: "storage-rack",
      name: "Storage Rack",
      category: "Storage",
      price: 19900,
      image: "img/storagerack1.jpg",
      images: ["img/storagerack1.jpg"],
      description: "Space-saving storage rack.",
      stock: 40,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  console.log("Seeded products:", products.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
