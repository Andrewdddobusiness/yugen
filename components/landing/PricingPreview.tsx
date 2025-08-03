"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check, Sparkles, Crown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free Explorer",
    price: 0,
    period: "forever",
    description: "Perfect for casual travelers planning simple trips",
    icon: <Sparkles className="h-6 w-6" />,
    color: "blue",
    popular: false,
    features: [
      "Up to 3 itineraries",
      "Basic place discovery",
      "Simple list organization",
      "PDF export",
      "Mobile access",
      "Community support"
    ],
    cta: "Start Free"
  },
  {
    name: "Pro Planner", 
    price: 9,
    period: "month",
    description: "For serious travelers who want advanced planning tools",
    icon: <Crown className="h-6 w-6" />,
    color: "purple",
    popular: true,
    features: [
      "Unlimited itineraries",
      "Advanced map search",
      "Drag & drop calendar",
      "All export formats", 
      "Collaboration tools",
      "Priority support",
      "Offline access",
      "Custom branding"
    ],
    cta: "Start 14-Day Trial"
  },
  {
    name: "Team Travel",
    price: 29,
    period: "month",
    description: "Built for travel agencies and group organizers",
    icon: <Users className="h-6 w-6" />,
    color: "green",
    popular: false,
    features: [
      "Everything in Pro",
      "Team collaboration",
      "Client management",
      "White-label options",
      "Advanced analytics",
      "API access",
      "Dedicated support",
      "Custom integrations"
    ],
    cta: "Contact Sales"
  }
];

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-600",
    accent: "bg-blue-600",
    button: "bg-blue-600 hover:bg-blue-700"
  },
  purple: {
    bg: "bg-purple-50", 
    border: "border-purple-200",
    text: "text-purple-600",
    accent: "bg-purple-600",
    button: "bg-purple-600 hover:bg-purple-700"
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200", 
    text: "text-green-600",
    accent: "bg-green-600",
    button: "bg-green-600 hover:bg-green-700"
  }
};

export default function PricingPreview() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section className="py-24 bg-white" ref={sectionRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start free and upgrade only when you need more. No hidden fees, no surprises.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const colors = colorClasses[plan.color as keyof typeof colorClasses];
            
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className={`relative rounded-2xl border-2 p-8 transition-all duration-300 hover:shadow-xl ${
                  plan.popular 
                    ? `${colors.bg} ${colors.border} shadow-lg scale-105` 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 ${colors.accent} text-white text-sm font-semibold rounded-full`}>
                    Most Popular
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className={`inline-flex p-3 rounded-xl mb-4 ${
                    plan.popular ? colors.accent : 'bg-gray-100'
                  }`}>
                    <div className={plan.popular ? 'text-white' : 'text-gray-600'}>
                      {plan.icon}
                    </div>
                  </div>
                  
                  <h3 className={`text-xl font-bold mb-2 ${
                    plan.popular ? colors.text : 'text-gray-900'
                  }`}>
                    {plan.name}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-900">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600 ml-1">
                        /{plan.period}
                      </span>
                    </div>
                    {plan.price > 0 && (
                      <div className="text-sm text-gray-500 mt-1">
                        Billed monthly
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center">
                      <div className={`p-1 rounded-full mr-3 ${colors.accent}`}>
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                    plan.popular 
                      ? `${colors.button} text-white` 
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-gray-600">
            All plans include a 30-day money-back guarantee. Questions?{" "}
            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
              Contact our team
            </a>
          </p>
        </motion.div>

        {/* Enterprise CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mt-16 text-center"
        >
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Need Something Custom?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              We work with large travel companies and enterprises to build custom solutions. 
              Contact us to discuss your specific needs.
            </p>
            <Button variant="outline" className="border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600">
              Enterprise Solutions
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}