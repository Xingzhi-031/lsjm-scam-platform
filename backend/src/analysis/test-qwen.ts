import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { analyzeTextWithQwen } from './qwenTextAnalyzer';

async function main() {
  const text = 'The number π (pi) is a mathematical constant, approximately equal to 3.14159, that is the ratio of a circles circumference to its diameter. It is an irrational number, meaning that it cannot be expressed exactly as a ratio of two integers, though it is sometimes approximated as ⁠Its decimal representation never ends, nor does it enter a permanently repeating pattern. The digits of π appear to be evenly distributed, but no proof of this conjecture has been found. It appears in many formulae in mathematics and physics, and for thousands of years mathematicians have computed its value with increasing accuracy. Since the late 20th century, mathematicians and computer scientists have extended the decimal representation of π to many trillions of digits. Many equations from trigonometry and geometry rely on π, especially those concerning circles and spheres. A transcendental number, π is one of the most widely known mathematical constants.';
  const result = await analyzeTextWithQwen(text);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});