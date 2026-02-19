import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import splashHand from "@/assets/bountt-splash-hand.png";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/auth");
    }, 2200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="screen-container bg-background overflow-hidden">
      {/* Main content — centered wordmark */}
      <div className="flex flex-col items-center justify-center flex-1 px-8 pt-24">
        {/* bountt. wordmark */}
        <h1 className="bountt-wordmark text-5xl text-foreground mb-3">
          bountt<span className="text-primary">.</span>
        </h1>

        {/* Tagline */}
        <p className="text-muted-foreground text-base font-medium tracking-wide">
          Shared expenses made simple.
        </p>
      </div>

      {/* Orange hand illustration — bottom */}
      <div className="flex justify-center pb-0 mt-auto">
        <img
          src={splashHand}
          alt="Bountt illustration"
          className="w-full max-w-[430px] object-cover object-top"
          style={{ maxHeight: "55vh" }}
        />
      </div>
    </div>
  );
}
