export type LocalText = {
  en: string;
  vi: string;
};
export type Topic = 'nature' | 'stories' | 'science';
export interface DemoBook {
  id: string;
  title: LocalText;
  description: LocalText;
  topic: Topic;
  color: string;
  symbol: string;
  minutes: number;
  copies: number;
}
// Original fictional titles and cover designs. Replace with EVG-approved catalogue data later.
export const books: DemoBook[] = [
  { id: 'garden', title: { en: 'A tiny seed, a big world', vi: 'Hạt mầm nhỏ, thế giới lớn' }, description: { en: 'Follow a seed from the soil to the sunlight. What could you grow near your home?', vi: 'Theo chân hạt mầm từ lòng đất đến ánh nắng. Em có thể trồng gì gần nhà?' }, topic: 'nature', color: 'sage', symbol: '✳', minutes: 10, copies: 2 },
  { id: 'moon', title: { en: 'Hello, night sky', vi: 'Xin chào, bầu trời đêm' }, description: { en: 'Meet the Moon and notice how the sky changes. Start with what you can see tonight.', vi: 'Làm quen với Mặt Trăng và quan sát bầu trời thay đổi. Bắt đầu từ những gì em thấy tối nay.' }, topic: 'science', color: 'navy', symbol: '☾', minutes: 15, copies: 1 },
  { id: 'river', title: { en: 'Stories by the river', vi: 'Chuyện bên dòng sông' }, description: { en: 'A collection of imagined adventures about friendship, kindness, and a river village.', vi: 'Những chuyến phiêu lưu tưởng tượng về tình bạn, lòng tốt và một ngôi làng ven sông.' }, topic: 'stories', color: 'clay', symbol: '≈', minutes: 10, copies: 3 },
  { id: 'ocean', title: { en: 'Under the blue', vi: 'Dưới làn nước xanh' }, description: { en: 'Discover a world beneath the waves and small ways to care for our water.', vi: 'Khám phá thế giới dưới những con sóng và những cách nhỏ để bảo vệ nguồn nước.' }, topic: 'nature', color: 'blue', symbol: '≈', minutes: 15, copies: 1 },
  { id: 'build', title: { en: 'Little things we can build', vi: 'Những thứ nhỏ ta có thể làm' }, description: { en: 'Try a simple paper structure and explore how shapes help it stand.', vi: 'Thử làm một mô hình bằng giấy và khám phá cách hình dạng giúp mô hình đứng vững.' }, topic: 'science', color: 'ochre', symbol: '△', minutes: 20, copies: 2 },
  { id: 'friend', title: { en: 'A place for everyone', vi: 'Một nơi cho tất cả' }, description: { en: 'An imagined story about listening, making new friends, and finding where we belong.', vi: 'Một câu chuyện tưởng tượng về lắng nghe, kết bạn và tìm nơi mình thuộc về.' }, topic: 'stories', color: 'rose', symbol: '❋', minutes: 10, copies: 1 },
];
