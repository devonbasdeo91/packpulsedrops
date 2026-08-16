import React, { useState, useEffect } from "react";
import { Image } from "@/components/ui/image";

// Themed Unsplash images per category. Each category crossfade-rotates
// through multiple photos with a gentle pan animation on each.
const CATEGORY_IMAGES = {
  yugioh: [
    "https://images.unsplash.com/photo-1620336655071-6b2ea4272b15?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1742743032221-c4347613ec60?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1742743032139-b35007c4f859?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1742743031724-64f001c67d5b?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1742743032749-187b17179e0f?w=400&h=300&fit=crop&q=80",
  ],
  pokemon: [
    "https://images.unsplash.com/photo-1647892591880-58c55fd726d8?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1611931960487-4932667079f1?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1647892591717-28c7fd63bb3f?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1616196334218-caffdc9b2317?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1647893977173-59619da505d9?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1703023689733-6a4281149189?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1636391671086-6b4b776cd031?w=400&h=300&fit=crop&q=80",
  ],
  dragonball: [
    "https://images.unsplash.com/photo-1706076463257-20b41d9519f0?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1606663889134-b1dedb5ed8b7?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1575540325855-4b5d285a3845?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1733690683193-087f7bd60bdc?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1606894436761-7a742916220a?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1770116119319-9f18ecb50a92?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1759990639070-9d4708d8fe20?w=400&h=300&fit=crop&q=80",
  ],
  digimon: [
    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1577210944398-ad6d0ac22a5b?w=400&h=300&fit=crop&q=80",
  ],
  baseball: [
    "https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1607310073276-9f48dec47340?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1551306667-f32e7af055f2?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1551306683-9e7cf1661af1?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1587565221090-7b8497f86d9e?w=400&h=300&fit=crop&q=80",
  ],
  basketball: [
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1627627256672-027a4613d028?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519861531473-9200262188bf?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=400&h=300&fit=crop&q=80",
  ],
  naruto: [
    "https://images.unsplash.com/photo-1668293750324-bd77c1f08ca9?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1630710478039-9c680b99f800?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1615592389070-bcc97e05ad01?w=400&h=300&fit=crop&q=80",
  ],
  bleach: [
    "https://images.unsplash.com/photo-1742919062100-6b37306ad0fb?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1742919004125-23ac3c747646?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1742919062099-d02fad09182e?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1742919037270-78cc9f5220df?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1713766056305-d33bb4d71e1f?w=400&h=300&fit=crop&q=80",
  ],
  football: [
    "https://images.unsplash.com/photo-1566579090262-51cde5ebe92e?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1557174949-3b1f5b2e8fac?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1566577738928-c49fe1932e84?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1537882111161-c3379a777c8b?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1485313260896-6e6edf486858?w=400&h=300&fit=crop&q=80",
  ],
  soccer: [
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1570498839593-e565b39455fc?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1486286701208-1d58e9338013?w=400&h=300&fit=crop&q=80",
  ],
  cricket: [
    "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1512719994953-eabf50895df7?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1565787154274-c8d076ad34e7?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1674986778924-7a33c1531443?w=400&h=300&fit=crop&q=80",
  ],
  tennis: [
    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1545809074-59472b3f5ecc?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1545151414-8a948e1ea54f?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1499510318569-1a3d67dc3976?w=400&h=300&fit=crop&q=80",
  ],
  wnba: [
    "https://images.unsplash.com/photo-1608245449230-4ac19066d2d0?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1629901925121-8a141c2a42f4?w=400&h=300&fit=crop&q=80",
  ],
  nhl: [
    "https://images.unsplash.com/photo-1545471977-94cac22e71ed?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1514511719-9f5849dc16d0?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1486128105845-91daff43f404?w=400&h=300&fit=crop&q=80",
  ],
  golf: [
    "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500932334442-8761ee4810a7?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1632946269126-0f8edbe8b068?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1538648759472-7251f7cb2c2f?w=400&h=300&fit=crop&q=80",
  ],
  badminton: [
    "https://images.unsplash.com/photo-1708312604109-16c0be9326cd?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1722087642932-9b070e9a066e?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1599391398131-cd12dfc6c24e?w=400&h=300&fit=crop&q=80",
  ],
  tabletennis: [
    "https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1676827613262-5fba25cee5fd?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1646978567314-32cfd5a8854e?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1708268418738-4863baa9cf72?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1636734909254-ff5c43927e10?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1511067007398-7e4b90cfa4bc?w=400&h=300&fit=crop&q=80",
  ],
  swimming: [
    "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1560090995-01632a28895b?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1558617320-e695f0d420de?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1622629797619-c100e3e67e2e?w=400&h=300&fit=crop&q=80",
  ],
  trackfield: [
    "https://images.unsplash.com/photo-1549896869-ca27eeffe4fb?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1474546652694-a33dd8161d66?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1601121853354-e6e866bd2bac?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1547941126-3d5322b218b0?w=400&h=300&fit=crop&q=80",
  ],
  f1: [
    "https://images.unsplash.com/photo-1614949194403-9602bdc14a3a?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1742744652734-d5ec6598b5da?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1659203206829-218b9b5930e5?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1699138346782-8a8b211c3da2?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1698753047029-05b3011609b7?w=400&h=300&fit=crop&q=80",
    "https://images.unsplash.com/photo-1610905376670-5e7e0e8a3cfb?w=400&h=300&fit=crop&q=80",
  ],
};

const ROTATE_INTERVAL = 4000;

export default function CategoryImage({ category, className }) {
  const images = CATEGORY_IMAGES[category];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (!images || images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [category, images]);

  if (!images || images.length === 0) return null;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className || ""}`}>
      {images.map((src, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={src}
            alt={category}
            fittingType="fill"
            loading="lazy"
            className="animate-ken-burns h-full w-full"
          />
        </div>
      ))}
    </div>
  );
}