import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, ChevronRight, Gift, Award, Clock, Users, Building2, CreditCard, Sparkles } from 'lucide-react';
import LoyaltyCardService, { type LoyaltyCard, type CardActivity, type Reward } from '../../services/loyaltyCardService';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { BusinessSettingsService } from '../../services/businessSettingsService';
import { getStaffUsers, type User } from '../../services/userService';

interface CardDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	card: LoyaltyCard | null;
}

type SectionKey = 'overview' | 'program' | 'rewards' | 'activity' | 'business' | 'staff';

export const CardDetailsModal: React.FC<CardDetailsModalProps> = ({ isOpen, onClose, card }) => {
	const { t } = useTranslation();
	const [isLoading, setIsLoading] = useState(false);
	const [activities, setActivities] = useState<CardActivity[]>([]);
	const [rewards, setRewards] = useState<Reward[]>([]);
	const [businessDetailsHidden, setBusinessDetailsHidden] = useState(true);
	const [programDetails, setProgramDetails] = useState<any | null>(null);
	const [businessSettings, setBusinessSettings] = useState<any | null>(null);
	const [staff, setStaff] = useState<User[]>([]);
	const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
		overview: true,
		program: false,
		rewards: false,
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

	const loadBusinessDetails = async () => {
		if (!card?.businessId) return;
		const [settings, staffList] = await Promise.all([
			BusinessSettingsService.getBusinessSettings(card.businessId),
			getStaffUsers(parseInt(card.businessId, 10))
		]);
		setBusinessSettings(settings);
		setStaff(Array.isArray(staffList) ? staffList : []);
	};

	useEffect(() => {
		if (!businessDetailsHidden && card?.businessId) {
			loadBusinessDetails();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [businessDetailsHidden, card?.businessId]);

	if (!isOpen || !card) return null;

	const Header = (
		<div className="p-4 sm:p-6 bg-gray-50 border-b border-gray-200 flex items-start justify-between">
			<div className="space-y-1">
				<div className="flex items-center gap-2 text-gray-900 font-semibold text-lg">
					<CreditCard className="w-5 h-5 text-blue-600" />
					<span>{card.businessName || t('cards.business')}</span>
				</div>
				<div className="text-sm text-gray-500">{card.programName}</div>
			</div>
			<button aria-label={t('Close') || 'Close'} onClick={onClose} className="text-gray-400 hover:text-gray-600">
				<X className="w-6 h-6" />
			</button>
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
			<div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-xl flex flex-col overflow-hidden">
				{Header}
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
											<li key={r.id} className="py-2 flex items-center justify-between text-sm">
												<div className="text-gray-800">{r.name}</div>
												<div className="text-gray-500">{r.points} {t('points') || 'points'}</div>
											</li>
										))}
									</ul>
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
			</div>
		</div>
	);
};

export default CardDetailsModal;


