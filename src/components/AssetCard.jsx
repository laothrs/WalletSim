import React from 'react';

const AssetCard = ({ icon, name, symbol, price, userBalance, priceChangePercentage }) => {
  const calculateTotalValue = (balance, currentPrice) => {
    return (balance * currentPrice).toFixed(2);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const totalUSDValue = calculateTotalValue(userBalance, price);
  const isPositiveChange = priceChangePercentage >= 0;

  return (
    <div className="bg-gray-700 rounded-lg p-4 flex items-center space-x-4 cursor-pointer hover:bg-gray-600 transform hover:scale-105 transition-all duration-200 shadow-md">
      {/* Left Section: Icon and Asset Name/Symbol */}
      <img src={icon} alt={name} className="w-12 h-12 rounded-full object-cover" />
      <div className="flex-grow flex flex-col justify-center">
        <p className="text-lg font-semibold text-white">{name}</p>
        <p className="text-sm text-gray-400">{symbol.toUpperCase()}</p>
      </div>

      {/* Right Section: USD Value and Asset Balance */}
      <div className="flex flex-col items-end">
        <p className="text-lg font-bold text-white">{formatCurrency(totalUSDValue)}</p>
        <p className="text-sm text-gray-400">{userBalance.toFixed(6)} {symbol.toUpperCase()}</p>
        {priceChangePercentage !== undefined && (
          <p className={`text-xs ${isPositiveChange ? 'text-green-400' : 'text-red-400'}`}>
            {isPositiveChange ? '+' : ''}{priceChangePercentage.toFixed(2)}%
          </p>
        )}
      </div>
    </div>
  );
};

export default AssetCard; 