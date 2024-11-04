/**
 * old:
const formatNumber = num => num ? new Intl.NumberFormat('en-US').format(Math.round(num)) : '';
const formatYears = num => num ? num.toFixed(1) : '';
*/

/**
 * 
 * fix: 
 * 
 * const formatNumber = (num?: number) => num !== undefined && num !== null ? new Intl.NumberFormat('en-US').format(Math.round(num)) : '';
const formatYears = (num?: number) => num !== undefined && num !== null ? num.toFixed(1) : ''; 
*/


import React from 'react';
import { Area, AreaChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface AllocationConfig {
  name: string;
  cash: number;
  fixedIncome: number;
  equities: number;
  expectedReturn: number;
  volatility: number;
  description: string;
}

interface Allocations {
  conservative: AllocationConfig;
  moderate: AllocationConfig;
  aggressive: AllocationConfig;
}

type AllocationType = keyof Allocations;

const ALLOCATIONS: Allocations = {
  conservative: { name: 'Conservative', cash: 5, fixedIncome: 50, equities: 45, expectedReturn: 5.2, volatility: 8.0, description: 'Lower risk, stable returns' },
  moderate: { name: 'Moderate', cash: 5, fixedIncome: 25, equities: 70, expectedReturn: 6.5, volatility: 12.0, description: 'Balanced risk and return' },
  aggressive: { name: 'Aggressive', cash: 2, fixedIncome: 8, equities: 90, expectedReturn: 7.5, volatility: 15.0, description: 'Higher risk, higher potential return' }
};

const formatNumber = (num: number | undefined): string => num ? new Intl.NumberFormat('en-US').format(Math.round(num)) : '';
const formatYears = (num: number | undefined): string => num ? num.toFixed(1) : '';

const RetirementCalculator: React.FC = () => {
  const [currentAge, setCurrentAge] = React.useState<number>(55);
  const [retirementAge, setRetirementAge] = React.useState<number>(65);
  const [lifeExpectancy, setLifeExpectancy] = React.useState<number>(90);
  const [currentSavings, setCurrentSavings] = React.useState<number>(1500000);
  const [monthlyContribution, setMonthlyContribution] = React.useState<number>(3000);
  const [desiredRetirementIncome, setDesiredRetirementIncome] = React.useState<number>(200000);
  const [inflationRate] = React.useState<number>(2);
  const [showNominal, setShowNominal] = React.useState<boolean>(false);
  const [allocation, setAllocation] = React.useState<AllocationType>('moderate');

  const selectedAllocation = ALLOCATIONS[allocation];
  const nominalReturnRate = selectedAllocation.expectedReturn;
  const realReturnRate = ((1 + nominalReturnRate / 100) / (1 + inflationRate / 100) - 1) * 100;
  const portfolioVolatility = selectedAllocation.volatility / 100;
  const safeAssetsPercentage = selectedAllocation.cash + selectedAllocation.fixedIncome;

  interface TrialDataPoint {
    age: number;
    realBalance: number;
    nominalBalance: number;
    inflationFactor: number;
    safeAssetsValue: number;
    safeAssetsYearsCoverage: number;
    safeAssetsPercentage: number;
  }

  interface MonteCarloDataPoint {
    age: number;
    optimistic: number;
    likely: number;
    conservative: number;
    safeAssetsYearsCoverage: number;
    safeAssetsPercentage: number;
    inflationFactor: number;
  }

  const calculateMonteCarloProjections = () => {
    const trials = 1000;
    const scenarios: TrialDataPoint[][] = [];

    for (let i = 0; i < trials; i++) {
      let realBalance = currentSavings;
      const trialData: TrialDataPoint[] = [];
      
      for (let age = currentAge; age <= lifeExpectancy; age++) {
        const isRetired = age >= retirementAge;
        const yearsFromNow = age - currentAge;
        const inflationFactor = Math.pow(1 + inflationRate/100, yearsFromNow);
        const randomRealReturn = realReturnRate/100 + (Math.random() - 0.5) * portfolioVolatility;
        realBalance = realBalance * (1 + randomRealReturn) + (isRetired ? -desiredRetirementIncome : monthlyContribution * 12);
        const safeAssetsValue = Math.max(0, realBalance * (safeAssetsPercentage / 100));

        trialData.push({
          age,
          realBalance: Math.max(0, Math.round(realBalance)),
          nominalBalance: Math.max(0, Math.round(realBalance * inflationFactor)),
          inflationFactor,
          safeAssetsValue,
          safeAssetsYearsCoverage: safeAssetsValue / desiredRetirementIncome,
          safeAssetsPercentage
        });
      }
      scenarios.push(trialData);
    }

    const percentileData: MonteCarloDataPoint[] = [];
    for (let age = currentAge; age <= lifeExpectancy; age++) {
      const ageBalances = scenarios.map(scenario => scenario.find(d => d.age === age)!);
      const realBalances = ageBalances.map(d => d.realBalance).sort((a, b) => a - b);
      const nominalBalances = ageBalances.map(d => d.nominalBalance).sort((a, b) => a - b);
      const safeAssetsYears = ageBalances.map(d => d.safeAssetsYearsCoverage).sort((a, b) => a - b);
      
      percentileData.push({
        age,
        optimistic: showNominal ? nominalBalances[Math.floor(nominalBalances.length * 0.9)] : realBalances[Math.floor(realBalances.length * 0.9)],
        likely: showNominal ? nominalBalances[Math.floor(nominalBalances.length * 0.5)] : realBalances[Math.floor(realBalances.length * 0.5)],
        conservative: showNominal ? nominalBalances[Math.floor(nominalBalances.length * 0.1)] : realBalances[Math.floor(realBalances.length * 0.1)],
        safeAssetsYearsCoverage: safeAssetsYears[Math.floor(safeAssetsYears.length * 0.5)],
        safeAssetsPercentage,
        inflationFactor: ageBalances[0].inflationFactor
      });
    }

    return {
      percentileData,
      successRate: (scenarios.filter(scenario => !scenario.some(point => point.realBalance <= 0)).length / trials) * 100
    };
  };

  const { percentileData: monteCarloData, successRate } = calculateMonteCarloProjections();
  const medianAtRetirement = monteCarloData.find(d => d.age === retirementAge)?.likely || 0;

  return (
    <div className="w-full max-w-6xl p-4 bg-white rounded-lg shadow-lg space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Retirement Calculator v1.3</h2>
        <label className="flex items-center text-sm">
          <input 
            type="checkbox" 
            checked={showNominal} 
            onChange={(e) => setShowNominal(e.target.checked)} 
            className="mr-2"
          />
          Show Future Dollars
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Desired Annual Retirement Income</label>
            <input 
              type="text" 
              value={formatNumber(desiredRetirementIncome)}
              onChange={(e) => setDesiredRetirementIncome(Number(e.target.value.replace(/,/g, '')))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Current Savings</label>
            <input 
              type="text" 
              value={formatNumber(currentSavings)}
              onChange={(e) => setCurrentSavings(Number(e.target.value.replace(/,/g, '')))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monthly Contribution</label>
            <input 
              type="text" 
              value={formatNumber(monthlyContribution)}
              onChange={(e) => setMonthlyContribution(Number(e.target.value.replace(/,/g, '')))}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Current Age</label>
            <input 
              type="number" 
              value={currentAge} 
              min="18" 
              max={retirementAge}
              onChange={(e) => setCurrentAge(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Retirement Age</label>
            <input 
              type="number" 
              value={retirementAge} 
              min={currentAge} 
              max={lifeExpectancy}
              onChange={(e) => setRetirementAge(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Life Expectancy</label>
            <input 
              type="number" 
              value={lifeExpectancy} 
              min={retirementAge} 
              max={120}
              onChange={(e) => setLifeExpectancy(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded">
        <h3 className="font-semibold mb-4">Investment Strategy</h3>
        <div className="space-y-3">
          {(Object.entries(ALLOCATIONS) as [AllocationType, AllocationConfig][]).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <input 
                type="radio" 
                id={key} 
                checked={allocation === key}
                onChange={() => setAllocation(key)} 
                className="form-radio"
              />
              <label htmlFor={key} className="flex-1">
                <div className="font-medium">{value.name}</div>
                <div className="text-sm text-gray-500">{value.description}</div>
                <div className="text-xs text-gray-500">
                  {value.equities}% Stocks, {value.fixedIncome}% Bonds, {value.cash}% Cash
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded">
        <h3 className="font-semibold mb-2">Portfolio Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p>Portfolio at Retirement: ${formatNumber(medianAtRetirement)}</p>
            <p>Annual Withdrawal: ${formatNumber(desiredRetirementIncome)}</p>
          </div>
          <div>
            <p>Success Rate: {Math.round(successRate)}%</p>
            <p>Years to Retirement: {retirementAge - currentAge}</p>
          </div>
        </div>
      </div>

      <div className="h-96">
        <div className="flex justify-between items-baseline mb-2">
          <h3 className="font-semibold">Portfolio Value Projection</h3>
          <span className="text-sm text-gray-600">
            {showNominal ? 'Future Dollars' : "Today's Dollars"}
          </span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monteCarloData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <XAxis dataKey="age" tick={{ fontSize: 12 }}/>
            <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} width={80}/>
            <Tooltip formatter={(value) => [`$${formatNumber(value as number)}`, "Portfolio Value"]} labelFormatter={(age) => `Age: ${age}`}/>
            <Area type="monotone" dataKey="optimistic" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.1} name="Optimistic"/>
            <Area type="monotone" dataKey="likely" stroke="#2196F3" fill="#2196F3" fillOpacity={0.2} name="Average"/>
            <Area type="monotone" dataKey="conservative" stroke="#FFA726" fill="#FFA726" fillOpacity={0.1} name="Conservative"/>
            <Legend/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="h-96">
        <div className="flex justify-between items-baseline mb-2">
          <h3 className="font-semibold">Safe Assets Coverage</h3>
          <span className="text-sm text-gray-600">Years of Retirement Income</span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monteCarloData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <XAxis dataKey="age" tick={{ fontSize: 12 }}/>
            <YAxis yAxisId="left" tickFormatter={(value) => `${formatYears(value)} yrs`} tick={{ fontSize: 12 }} width={80}/>
            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12 }} width={50} domain={[0, 100]}/>
            <Tooltip formatter={(value, name) => {
              if (name === "Safe Assets %") {
                return [`${value}%`, 'Portfolio Allocation'];
              }
              return [`${formatYears(value as number)} years`, 'Years of Income Coverage'];
            }}/>
            <Line yAxisId="left" type="linear" dataKey="safeAssetsYearsCoverage" stroke="#2196F3" name="Years of Income Coverage"/>
            <Line yAxisId="right" type="linear" dataKey="safeAssetsPercentage" stroke="#4CAF50" name="Safe Assets %"/>
            <Legend/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RetirementCalculator;
