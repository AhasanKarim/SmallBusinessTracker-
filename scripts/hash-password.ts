// Usage: npm run hash-password -- 'your-password'
import bcrypt from "bcryptjs";

const pw = process.argv.slice(2).join(" ").trim();
if (!pw) {
  console.error("Usage: npm run hash-password -- 'your-password'");
  process.exit(1);
}
bcrypt.hash(pw, 12).then((hash) => {
  console.log(hash);
});
