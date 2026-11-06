import type { LocalText, Topic } from '../../demo/catalogue';

export interface LearningResource {
  id: string;
  topic: Topic;
  title: LocalText;
  description: LocalText;
  prompt: LocalText;
  publisher: string;
  kind: 'video' | 'article' | 'interactive';
  language: 'en' | 'bilingual';
  url: string;
  vietnameseUrl?: string;
}

/** Public educator resources checked 7 November 2026. No embedded third-party players. */
export const learningResources: LearningResource[] = [
  {
    id: 'earth-water', topic: 'nature', publisher: 'NASA Space Place', kind: 'video', language: 'en',
    title: { en: 'Where is Earth’s water?', vi: 'Nước trên Trái Đất ở đâu?' },
    description: { en: 'A short video with a written transcript about our watery planet.', vi: 'Video ngắn kèm lời thoại về nước trên hành tinh của chúng ta.' },
    prompt: { en: 'Find one place where water can hide.', vi: 'Tìm một nơi mà nước có thể ẩn mình.' },
    url: 'https://spaceplace.nasa.gov/water/en/',
  },
  {
    id: 'asian-elephant', topic: 'nature', publisher: 'Smithsonian’s National Zoo', kind: 'article', language: 'en',
    title: { en: 'Meet an Asian elephant', vi: 'Làm quen với voi châu Á' },
    description: { en: 'Explore how elephants live, communicate, and use their trunks.', vi: 'Khám phá cách voi sống, giao tiếp và sử dụng vòi.' },
    prompt: { en: 'Choose one feature and explain how it helps the elephant.', vi: 'Chọn một đặc điểm và giải thích nó giúp ích cho voi thế nào.' },
    url: 'https://nationalzoo.si.edu/animals/asian-elephant',
  },
  {
    id: 'library-lion', topic: 'stories', publisher: 'Storyline Online · SAG-AFTRA Foundation', kind: 'video', language: 'en',
    title: { en: 'Listen to Library Lion', vi: 'Nghe truyện Library Lion' },
    description: { en: 'Listen to a picture-book reading set in a very surprising library.', vi: 'Nghe đọc một cuốn truyện tranh lấy bối cảnh ở thư viện đầy bất ngờ.' },
    prompt: { en: 'What would you ask one of the characters?', vi: 'Em muốn hỏi một nhân vật điều gì?' },
    url: 'https://storylineonline.net/books/library-lion/',
  },
  {
    id: 'lion-mouse', topic: 'stories', publisher: 'British Council · LearnEnglish Kids', kind: 'video', language: 'en',
    title: { en: 'The lion and the mouse', vi: 'Sư tử và chuột nhắt' },
    description: { en: 'Watch a traditional story, or use the printable story and activities.', vi: 'Xem một câu chuyện dân gian hoặc đọc bản in và làm hoạt động đi kèm.' },
    prompt: { en: 'Retell the story in three sentences of your own.', vi: 'Kể lại câu chuyện bằng ba câu của riêng em.' },
    url: 'https://learnenglishkids.britishcouncil.org/listen-watch/short-stories/lion-mouse',
  },
  {
    id: 'rocket-launch', topic: 'science', publisher: 'NASA Space Place', kind: 'video', language: 'en',
    title: { en: 'How does a rocket lift off?', vi: 'Tên lửa cất cánh như thế nào?' },
    description: { en: 'Watch a launch explanation and explore the illustrated article.', vi: 'Xem giải thích về việc phóng tên lửa và đọc bài viết có hình minh họa.' },
    prompt: { en: 'Draw two arrows to show which way the rocket and exhaust move.', vi: 'Vẽ hai mũi tên để chỉ hướng di chuyển của tên lửa và khí thải.' },
    url: 'https://spaceplace.nasa.gov/launching-into-space/en/',
  },
  {
    id: 'balancing-act', topic: 'science', publisher: 'PhET · University of Colorado Boulder', kind: 'interactive', language: 'bilingual',
    title: { en: 'Can you balance it?', vi: 'Em có thể giữ thăng bằng không?' },
    description: { en: 'Move objects on a virtual balance and see what changes.', vi: 'Di chuyển các vật trên một chiếc bập bênh ảo và quan sát thay đổi.' },
    prompt: { en: 'Make a prediction before you move an object. Were you right?', vi: 'Dự đoán trước khi di chuyển một vật. Kết quả có đúng như em nghĩ không?' },
    url: 'https://phet.colorado.edu/en/simulations/balancing-act',
    vietnameseUrl: 'https://phet.colorado.edu/vi/simulations/balancing-act',
  },
];
