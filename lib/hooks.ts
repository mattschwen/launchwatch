'use client';

import { useState, useEffect } from 'react';
import { Launch, RocketFact } from './types';
import { getAllUpcomingLaunches, getLiveLaunches, getNextLaunch, getRocketFacts } from './api';

export function useLaunches() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLaunches() {
      try {
        setLoading(true);
        const data = await getAllUpcomingLaunches();
        setLaunches(data);
        setError(null);
      } catch (err) {
        setError('Failed to load launches');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchLaunches();
    // Refresh every 2 minutes
    const interval = setInterval(fetchLaunches, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { launches, loading, error };
}

export function useLiveLaunches() {
  const [liveLaunches, setLiveLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLiveLaunches() {
      try {
        setLoading(true);
        const data = await getLiveLaunches();
        setLiveLaunches(data);
        setError(null);
      } catch (err) {
        setError('Failed to load live launches');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchLiveLaunches();
    // Refresh every 30 seconds for live launches
    const interval = setInterval(fetchLiveLaunches, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { liveLaunches, loading, error };
}

export function useNextLaunch() {
  const [nextLaunch, setNextLaunch] = useState<Launch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNextLaunch() {
      try {
        setLoading(true);
        const data = await getNextLaunch();
        setNextLaunch(data);
        setError(null);
      } catch (err) {
        setError('Failed to load next launch');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchNextLaunch();
    // Refresh every minute
    const interval = setInterval(fetchNextLaunch, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { nextLaunch, loading, error };
}

export function useRocketFacts() {
  const [facts, setFacts] = useState<RocketFact[]>([]);
  const [currentFact, setCurrentFact] = useState<RocketFact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFacts() {
      try {
        setLoading(true);
        const data = await getRocketFacts();
        setFacts(data);
        if (data.length > 0) {
          setCurrentFact(data[Math.floor(Math.random() * data.length)]);
        }
        setError(null);
      } catch (err) {
        setError('Failed to load rocket facts');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchFacts();
  }, []);

  useEffect(() => {
    if (facts.length === 0) return;

    // Rotate facts every 15 seconds
    const interval = setInterval(() => {
      const randomFact = facts[Math.floor(Math.random() * facts.length)];
      setCurrentFact(randomFact);
    }, 15 * 1000);

    return () => clearInterval(interval);
  }, [facts]);

  return { currentFact, facts, loading, error };
}

export function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });

  useEffect(() => {
    function calculateTimeLeft() {
      const difference = new Date(targetDate).getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          total: difference
        });
      } else {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0
        });
      }
    }

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}
