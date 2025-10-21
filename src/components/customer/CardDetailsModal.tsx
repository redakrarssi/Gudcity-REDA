import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, ChevronRight, Gift, Award, Clock, Users, Building2, CreditCard, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoyaltyCardService, { type LoyaltyCard, type CardActivity, type Reward } from '../../services/loyaltyCardService';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { BusinessSettingsService } from '../../services/businessSettingsService';
import { type User } from '../../services/userService';

interface CardDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	card: LoyaltyCard | null;
	onAfterRedemption?: () => void;
}

type SectionKey = 'overview' | 'program' | 'rewards' | 'activity' | 'business' | 'staff';

export const CardDetailsModal: React.FC<CardDetailsModalProps> = ({ isOpen, onClose, card, onAfterRedemption }) => {
	const { t } = useTranslation();
	const [isLoading, setIsLoading] = useState(false);
	const [activities, setActivities] = useState<CardActivity[]>([]);
	const [rewards, setRewards] = useState<Reward[]>([]);
	const [businessDetailsHidden, setBusinessDetailsHidden] = useState(true);
	const [programDetails, setProgramDetails] = useState<any | null>(null);
	const [businessSettings, setBusinessSettings] = useState<any | null>(null);
	const [staff, setStaff] = useState<User[]>([]);
	const [isRedeemingId, setIsRedeemingId] = useState<string | null>(null);
	const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
	const [showConfetti, setShowConfetti] = useState(false);
	const [currentPoints, setCurrentPoints] = useState<number>(0);
	const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
		overview: true,
		program: false,
		rewards: true,
		activity: false,
		business: false,
		staff: false
	});

	useEffect(() => {
		let isMounted = true;
		const load = async () => {
			if (!isOpen || !card) return;
			setIsLoading(true);
			try {
				const [acts, prog, rwd] = await Promise.all([
					LoyaltyCardService.getCardActivities(card.id, 20),
					card.programId ? LoyaltyProgramService.getProgramById(card.programId) : Promise.resolve(null),
					card.programId ? LoyaltyCardService.getProgramRewards(card.programId) : Promise.resolve([])
				]);
				if (!isMounted) return;
				setActivities(Array.isArray(acts) ? acts : []);
				setProgramDetails(prog);
				setRewards(Array.isArray(rwd) ? rwd : []);
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};
		load();
		return () => { isMounted = false; };
	}, [isOpen, card?.id, card?.programId]);

useEffect(() => {
	if (card) {
		setCurrentPoints(card.points || 0);
		// reset success banner when switching cards
		setRedeemSuccess(null);
	}
}, [card?.id]);

	const loadBusinessDetails = async () => {
		if (!card?.businessId) return;
		// TODO: Implement staff fetching through API when endpoint is available
		const settings = await BusinessSettingsService.getBusinessSettings(card.businessId);
		setBusinessSettings(settings);
		setStaff([]); // Temporarily disabled until staff API endpoint is implemented
	};

	useEffect(() => {
		if (!businessDetailsHidden && card?.businessId) {
			loadBusinessDetails();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [businessDetailsHidden, card?.businessId]);

	if (!isOpen || !card) return null;

	const Header = (
		<div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 flex items-start justify-between relative overflow-hidden">
			<div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
			<div className="relative space-y-1 text-white">
				<div className="flex items-center gap-2 font-semibold text-lg">
					<CreditCard className="w-5 h-5" />
					<span>{card.businessName || t('cards.business')}</span>
				</div>
				<div className="text-sm/5 opacity-90">{card.programName}</div>
			</div>
			<div className="relative flex items-center gap-3">
				<div className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-sm font-medium shadow-inner shadow-white/10">
					{t('Points') || 'Points'}: <span className="font-semibold">{currentPoints}</span>
				</div>
				<button aria-label={t('Close') || 'Close'} onClick={onClose} className="text-white/90 hover:text-white">
					<X className="w-6 h-6" />
				</button>
			</div>
			{/* 3px bottom expansion/accent */}
			<div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20" />
		</div>
	);

	const SectionHeader: React.FC<{ title: string; icon?: React.ReactNode; section: SectionKey }>
		= ({ title, icon, section }) => (
		<button onClick={() => setExpanded(prev => ({ ...prev, [section]: !prev[section] }))}
			className="w-full flex items-center justify-between py-3">
			<div className="flex items-center gap-2 text-gray-800 font-medium">
				{icon}
				<span>{title}</span>
			</div>
			{expanded[section] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
		</button>
	);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
				{Header}
				{redeemSuccess && (
					<div className="px-4 sm:px-6 pt-4">
						<div className="rounded-lg border border-green-200 bg-green-50 text-green-800 p-3 text-sm">
							{redeemSuccess}
						</div>
					</div>
				)}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
					{/* Overview */}
					<div className="border border-gray-200 rounded-lg">
						<div className="px-4">
							<SectionHeader section="overview" title={t('Overview') || 'Overview'} icon={<Sparkles className="w-4 h-4 text-amber-500" />} />
						</div>
						{expanded.overview && (
							<div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
								<div><span className="text-gray-500">{t('Card Number') || 'Card Number'}:</span> {card.cardNumber}</div>
								<div><span className="text-gray-500">{t('Tier') || 'Tier'}:</span> {card.tier}</div>
								<div><span className="text-gray-500">{t('Points') || 'Points'}:</span> {card.points}</div>
								{card.nextReward && <div><span className="text-gray-500">{t('Next Reward') || 'Next Reward'}:</span> {card.nextReward}</div>}
								{card.pointsToNext != null && <div><span className="text-gray-500">{t('Points to next') || 'Points to next'}:</span> {card.pointsToNext}</div>}
							</div>
						)}
					</div>

					{/* Rewards */}
					<div className="border border-gray-200 rounded-lg">
						<div className="px-4">
							<SectionHeader section="rewards" title={t('Rewards') || 'Rewards'} icon={<Gift className="w-4 h-4 text-green-600" />} />
						</div>
						{expanded.rewards && (
							<div className="px-4 pb-4">
								{rewards.length === 0 ? (
									<div className="text-sm text-gray-500">{t('No rewards available') || 'No rewards available'}</div>
								) : (
									<ul className="divide-y divide-gray-100">
										{rewards.map(r => (
											<li key={r.id} className="py-3 flex items-center justify-between text-sm">
												<div className="text-gray-800">
													<div className="font-medium">{r.name}</div>
													<div className="text-gray-500">{r.points} {t('points') || 'points'}</div>
												</div>
								<div className="flex items-center gap-2">
									{currentPoints >= r.points ? (
														<button
															onClick={async () => {
															if (!card) return;
															setIsRedeemingId(r.id);
															try {
															const result = await LoyaltyCardService.redeemReward(card.id, r.id);
																if (result?.success) {
																	setRedeemSuccess(result.trackingCode ? `${result.message} • ${(t('Tracking code') || 'Tracking code')}: ${result.trackingCode}` : result.message);
																// deduct points locally for instant sync
																setCurrentPoints(prev => Math.max(0, prev - r.points));
																	setShowConfetti(true);
																	setTimeout(() => setShowConfetti(false), 3000);
																	try {
																		const acts = await LoyaltyCardService.getCardActivities(card.id, 20);
																		setActivities(Array.isArray(acts) ? acts : []);
																	} catch {}
											// notify parent to refetch cards
											if (onAfterRedemption) {
												onAfterRedemption();
											}
																}
															} finally {
																setIsRedeemingId(null);
															}
														}}
														className={`px-3 py-1.5 rounded-md text-white text-xs font-medium transition-colors ${isRedeemingId === r.id ? 'bg-green-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'}`}
														disabled={isRedeemingId === r.id}
													>
														{isRedeemingId === r.id ? (t('Redeeming...') || 'Redeeming...') : (t('Redeem') || 'Redeem')}
													</button>
									) : null}
												</div>
											</li>
										))}
									</ul>
								)}
							</div>
						)}
					</div>

					{/* Program Details */}
					<div className="border border-gray-200 rounded-lg">
						<div className="px-4">
							<SectionHeader section="program" title={t('Program Details') || 'Program Details'} icon={<Award className="w-4 h-4 text-purple-600" />} />
						</div>
						{expanded.program && (
							<div className="px-4 pb-4 text-sm text-gray-700 space-y-2">
								<div className="font-medium">{programDetails?.name || card.programName}</div>
								{programDetails?.description && <p className="text-gray-600">{programDetails.description}</p>}
								{Array.isArray(programDetails?.rewardTiers) && programDetails.rewardTiers.length > 0 && (
									<div className="mt-2">
										<div className="text-gray-500 mb-1">{t('Reward Tiers') || 'Reward Tiers'}</div>
										<ul className="list-disc pl-5 space-y-1">
											{programDetails.rewardTiers.map((tier: any) => (
												<li key={tier.id}>{tier.reward} — {tier.pointsRequired} {t('points') || 'points'}</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Activity */}
					<div className="border border-gray-200 rounded-lg">
						<div className="px-4">
							<SectionHeader section="activity" title={t('Recent Activity') || 'Recent Activity'} icon={<Clock className="w-4 h-4 text-blue-600" />} />
						</div>
						{expanded.activity && (
							<div className="px-4 pb-4">
								{activities.length === 0 ? (
									<div className="text-sm text-gray-500">{t('No recent activity') || 'No recent activity'}</div>
								) : (
									<ul className="divide-y divide-gray-100">
										{activities.map(a => (
											<li key={a.id} className="py-2 text-sm">
												<div className="flex items-center justify-between">
													<div className="text-gray-800">{a.description || a.type}</div>
													<div className="text-gray-600">{a.points} {t('pts') || 'pts'}</div>
												</div>
												<div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</div>
											</li>
										))}
									</ul>
								)}
							</div>
						)}
					</div>

					{/* Business Details (hidden until shown) */}
					<div className="border border-gray-200 rounded-lg">
						<div className="px-4 flex items-center justify-between py-3">
							<div className="flex items-center gap-2 text-gray-800 font-medium">
								<Building2 className="w-4 h-4 text-gray-700" />
								<span>{t('Business Details') || 'Business Details'}</span>
							</div>
							<button onClick={() => setBusinessDetailsHidden(prev => !prev)} className="text-sm text-blue-600 hover:text-blue-700">
								{businessDetailsHidden ? (t('Show') || 'Show') : (t('Hide') || 'Hide')}
							</button>
						</div>
						{!businessDetailsHidden && (
							<div className="px-4 pb-4 text-sm text-gray-700 space-y-1">
								{!businessSettings && <div className="text-gray-500">{t('Loading...') || 'Loading...'}</div>}
								{businessSettings && (
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div><span className="text-gray-500">{t('Name') || 'Name'}:</span> {businessSettings.name}</div>
										{businessSettings.address && <div><span className="text-gray-500">{t('Address') || 'Address'}:</span> {businessSettings.address}</div>}
										{businessSettings.phone && <div><span className="text-gray-500">{t('Phone') || 'Phone'}:</span> {businessSettings.phone}</div>}
										{businessSettings.email && <div><span className="text-gray-500">{t('Email') || 'Email'}:</span> {businessSettings.email}</div>}
										{businessSettings.website && <div><span className="text-gray-500">{t('Website') || 'Website'}:</span> {businessSettings.website}</div>}
									</div>
								)}
							</div>
						)}
					</div>

					{/* Staff */}
					<div className="border border-gray-200 rounded-lg">
						<div className="px-4">
							<SectionHeader section="staff" title={t('Staff') || 'Staff'} icon={<Users className="w-4 h-4 text-teal-600" />} />
						</div>
						{expanded.staff && (
							<div className="px-4 pb-4">
								{businessDetailsHidden && (
									<div className="text-sm text-amber-600 mb-2">{t('Show business details to load staff') || 'Show business details to load staff'}</div>
								)}
								{!businessDetailsHidden && staff.length === 0 && (
									<div className="text-sm text-gray-500">{t('No staff listed') || 'No staff listed'}</div>
								)}
								{!businessDetailsHidden && staff.length > 0 && (
									<ul className="divide-y divide-gray-100">
										{staff.map(member => (
											<li key={member.id} className="py-2 text-sm">
												<div className="flex items-center justify-between">
													<div className="text-gray-800">{member.name}</div>
													<div className="text-gray-500">{member.email}</div>
												</div>
											</li>
										))}
									</ul>
								)}
							</div>
						)}
					</div>
				</div>
				<div className="p-4 border-t border-gray-200 flex justify-end gap-2">
					<button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200">{t('Close') || 'Close'}</button>
				</div>

				{/* Confetti overlay */}
				<AnimatePresence>
					{showConfetti && (
						<div className="pointer-events-none absolute inset-0 z-20">
							{Array.from({ length: 60 }).map((_, i) => {
								const left = Math.random() * 100;
								const delay = Math.random() * 0.3;
								const duration = 3.0; // exactly 3 seconds
								const size = 6 + Math.floor(Math.random() * 6);
								const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
								const color = colors[i % colors.length];
								return (
									<motion.span
										key={i}
										initial={{ y: '100%', opacity: 0, rotate: 0 }}
										animate={{ y: '-10%', opacity: 1, rotate: 360 }}
										exit={{ opacity: 0 }}
										transition={{ duration, delay, ease: 'easeOut' }}
										style={{ left: `${left}%`, width: size, height: size, backgroundColor: color }}
										className="absolute bottom-0 rounded-sm shadow-sm"
									/>
								);
							})}
						</div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};

export default CardDetailsModal;


