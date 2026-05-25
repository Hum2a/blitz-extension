import { useState } from "react";
import { motion } from "framer-motion";
import { setStorage, getStorage } from "../lib/storage.js";
import { LEMONSQUEEZY } from "../lib/config.js";
import { Btn, Stagger, FadeUp } from "./motion.jsx";

export default function LicenseGate({ onSettings }) {
  const [key, setKey] = useState("");
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const result = await chrome.runtime.sendMessage({
        type: "VALIDATE_LICENSE",
        payload: { key },
      });
      if (result?.valid) {
        const license = await getStorage("license");
        await setStorage("license", {
          ...license,
          key,
          tier: result.tier,
          validatedAt: new Date().toISOString(),
        });
        window.location.reload();
      } else {
        alert(result?.message || "Invalid license key");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setValidating(false);
    }
  };

  return (
    <motion.div
      className="p-6 text-center min-h-[520px] flex flex-col justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-blitz-100 flex items-center justify-center text-2xl"
        animate={{ y: [0, -6, 0], rotate: [0, 2, -2, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        ⚡
      </motion.div>
      <Stagger>
        <FadeUp>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            You&apos;ve used your 15 free applications
          </h2>
        </FadeUp>
        <FadeUp delay={0.05}>
          <p className="text-sm text-slate-600 mb-6">
            Upgrade to Pro for unlimited applications, or enter your license key.
          </p>
        </FadeUp>
        <FadeUp delay={0.1}>
          <div className="flex flex-col gap-2 mb-4">
            <motion.a
              href={LEMONSQUEEZY.checkoutMonthly}
              target="_blank"
              rel="noreferrer"
              className="block w-full bg-blitz-600 text-white py-2.5 rounded-lg font-medium hover:bg-blitz-700 btn-shine"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              Pro — £8/month
            </motion.a>
            <motion.a
              href={LEMONSQUEEZY.checkoutYearly}
              target="_blank"
              rel="noreferrer"
              className="block w-full border border-blitz-600 text-blitz-700 py-2.5 rounded-lg font-medium hover:bg-blitz-50"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              Pro — £49/year
            </motion.a>
          </div>
        </FadeUp>
        <FadeUp delay={0.15}>
          <div className="space-y-2">
            <motion.input
              type="text"
              placeholder="License key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blitz-300"
              whileFocus={{ scale: 1.01 }}
            />
            <Btn
              onClick={handleValidate}
              disabled={validating || !key.trim()}
              className="w-full border border-slate-300 py-2 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 bg-white"
            >
              {validating ? "Validating…" : "Activate license"}
            </Btn>
          </div>
        </FadeUp>
        <motion.button
          type="button"
          onClick={onSettings}
          className="mt-4 text-xs text-slate-500 underline"
          whileHover={{ scale: 1.05 }}
        >
          Settings
        </motion.button>
      </Stagger>
    </motion.div>
  );
}
