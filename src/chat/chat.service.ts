/**
 * ChatService handles user queries using OpenAI's function-calling capabilities.
 * It interprets natural language input and dynamically invokes custom business logic,
 * such as product search or currency conversion.
 */
import { Injectable } from '@nestjs/common';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { OpenAIService } from './openai/openai.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';

/**
 * Interface representing a single product from the catalog.
 */
export interface Product {
  displayTitle: string;
  embeddingText: string;
  url: string;
  imageUrl: string;
  productType: string;
  discount: number;
  price: string;
  variants: string;
  createDate: string;
}

@Injectable()
export class ChatService {
  constructor(private readonly openaiService: OpenAIService) {}

  /**
   * Processes the user query using OpenAI's function-calling interface.
   * It iteratively interprets and executes the appropriate function calls (like searching products or converting currencies),
   * feeding results back into the conversation until a final response is generated.
   *
   * @param query - The user’s natural language query.
   * @returns A final assistant response based on AI interpretation and function execution.
   */
  async processUserQuery(query: string): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'user',
        content: query,
      },
    ];

    // Define available functions the AI can call
    const functions = [
      {
        name: 'searchProducts',
        description: 'Search 2 relevant products from the catalog based on user query',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query, e.g., "phone", "gift for dad"',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'convertCurrencies',
        description: 'Converts an amount from one currency to another.',
        parameters: {
          type: 'object',
          properties: {
            amount: {
              type: 'string',
              description: 'Amount to convert. Can be a number or a range like "350.0 - 365.0".',
            },
            fromCurrency: {
              type: 'string',
              description: 'Three-letter ISO currency code to convert from (e.g., EUR)',
            },
            toCurrency: {
              type: 'string',
              description: 'Three-letter ISO currency code to convert to (e.g., USD, COP)',
            },
          },
          required: ['amount', 'fromCurrency', 'toCurrency'],
        },
      },
    ];

    let currentMessages = [...messages];
    let currentResponse = await this.openaiService.chatWithFunctions(currentMessages, functions);

    let step = 0;
    const maxSteps = 5; // Safety limit

    while (currentResponse.function_call && step < maxSteps) {
      const { name: functionName, arguments: functionArgs } = currentResponse.function_call;
      const parsedArgs = JSON.parse(functionArgs || '{}');

      let functionResult = '';

      // Handle AI-requested function calls
      if (functionName === 'searchProducts') {
        functionResult = await this.searchProducts(parsedArgs.query);
      } else if (functionName === 'convertCurrencies') {
        const { amount, fromCurrency, toCurrency } = parsedArgs;
        functionResult = await this.convertCurrencies(amount, fromCurrency, toCurrency);
      }

      currentMessages.push(currentResponse);
      currentMessages.push({
        role: 'function',
        name: functionName,
        content: functionResult,
      });

      currentResponse = await this.openaiService.chatWithFunctions(currentMessages, functions);
      step++;
    }

    return currentResponse.content || '[No final response]';
  }

  /**
   * Searches for products matching the query in a local CSV product catalog.
   * If no matches are found, returns two random fallback products.
   *
   * @param query - The product search keyword.
   * @returns A markdown-formatted string with product titles, descriptions, and prices.
   */
  private async searchProducts(query: string): Promise<string> {
    const matchedResults: Product[] = [];
    const allProducts: Product[] = [];
    const filePath = path.join(__dirname, '..', '..', 'data', 'Full Stack Test products_list.csv');

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: Product) => {
          const lowerQuery = query.toLowerCase();
          const matchInName = row.displayTitle.toLowerCase().includes(lowerQuery);
          const matchInDesc = row.embeddingText.toLowerCase().includes(lowerQuery);

          allProducts.push(row);

          if (matchInName || matchInDesc) {
            matchedResults.push(row);
          }
        })
        .on('end', () => {
          let selectedProducts: Product[];
          let messageHeader: string;

          if (matchedResults.length > 0) {
            selectedProducts = matchedResults.slice(0, 2);
            messageHeader = `Here are some products related to your query: "${query}"\n`;
          } else {
            const shuffled = allProducts.sort(() => 0.5 - Math.random());
            selectedProducts = shuffled.slice(0, 2);
            messageHeader = `I couldn’t find specific products for "${query}", but here are a couple of suggestions:\n`;
          }

          const formatted = selectedProducts
            .map(
              (p, i) =>
                `${i + 1}. **${p.displayTitle}**\n` +
                `   - ${p.embeddingText}\n` +
                `   - Price: $${p.price} USD`
            )
            .join('\n\n');

          resolve(`${messageHeader}\n${formatted}\n\nWould any of these interest you?`);
        })
        .on('error', (err) => reject(err));
    });
  }

  /**
   * Converts a given amount or range from one currency to another using the FastForex API.
   * Supports both single values and range formats like "350 - 365".
   *
   * @param amount - A string or number representing the amount to convert.
   * @param fromCurrency - The source currency code.
   * @param toCurrency - The target currency code.
   * @returns A formatted string with the converted amount(s).
   */
  private async convertCurrencies(amount: number | string,fromCurrency: string,toCurrency: string,): Promise<string> {
    const API_KEY = process.env.OPEN_EXCHANGE_RATES_API_KEY;
    const url = `https://api.fastforex.io/fetch-multi?from=${fromCurrency}&to=${toCurrency}&api_key=${API_KEY}`;

    try {
      const response = await axios.get(url);
      const rates = response.data.results;

      if (!rates || Object.keys(rates).length === 0) {
        return `No conversion rates found for ${fromCurrency} to ${toCurrency}.`;
      }

      // Handle ranges like "350 - 365"
      if (typeof amount === 'string' && amount.includes('-')) {
        const [minStr, maxStr] = amount.split('-').map(p => p.trim());
        const min = parseFloat(minStr);
        const max = parseFloat(maxStr);

        if (isNaN(min) || isNaN(max)) {
          return `Invalid amount range: "${amount}".`;
        }

        const rate = rates[toCurrency];
        if (!rate) {
          return `Conversion rate not available for ${toCurrency}.`;
        }

        const convertedMin = min * rate;
        const convertedMax = max * rate;

        return `${amount} ${fromCurrency} ≈ ${convertedMin.toFixed(2)} - ${convertedMax.toFixed(2)} ${toCurrency}`;
      }

      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(numericAmount)) {
        return `Invalid amount: ${amount}`;
      }

      const resultStrings: string[] = [];

      for (const [currency, rate] of Object.entries(rates)) {
        const convertedAmount = numericAmount * Number(rate);
        resultStrings.push(`${numericAmount} ${fromCurrency} ≈ ${convertedAmount.toFixed(2)} ${currency}`);
      }

      return resultStrings.join(' | ');
    } catch (error) {
      console.error('Error fetching exchange rates:', error.message);
      return 'An error occurred while converting currencies.';
    }
  }
}
