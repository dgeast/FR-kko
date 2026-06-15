import random
import datetime
import re
import logging

logger = logging.getLogger(__name__)

class ChatEngine:
    def __init__(self):
        self.responses = {
            # 인사
            r"(안녕|hello|hi|반갑|안녕하세요)": [
                "안녕하세요! 반갑습니다.",
                "안녕! 어떻게 도와드릴까요?",
                "Hello! 좋은 만남이네요.",
            ],
            
            # 이름
            r"(너 누구|당신 누구|이름|name|who are you)": [
                "저는 AI 어시스턴트입니다.",
                "저는 얼굴인식 AI 앱입니다.",
                "I'm your AI assistant!",
            ],
            
            # 시간
            r"(몇 시|시간|what time|time)": [
                f"지금은 {datetime.datetime.now().strftime('%H:%M')}입니다.",
                f"현재 시간: {datetime.datetime.now().strftime('%H:%M:%S')}",
            ],
            
            # 날씨
            r"(날씨|weather|비|맑음|구름)": [
                "날씨는 좋은 편입니다!",
                "오늘은 따뜻한 날씨네요.",
                "The weather is nice!",
            ],
            
            # 감사
            r"(고마워|감사|thank|thanks)": [
                "도움이 되어서 다행입니다!",
                "천만에요!",
                "You're welcome!",
            ],
            
            # 작별
            r"(안녕|bye|goodbye|끝)": [
                "안녕하세요! 다음에 또 뵙겠습니다.",
                "See you soon!",
                "좋은 하루 되세요!",
            ],
            
            # 기분
            r"(어때|어떻게|how are you|기분)": [
                "좋은 하루를 보내고 있습니다!",
                "I'm doing great, thanks for asking!",
                "기분이 좋네요!",
            ],
            
            # 도움
            r"(도움|help|기능|뭘 할 수)": [
                "저는 당신의 얼굴을 인식하고 대화할 수 있습니다!",
                "I can recognize your face and chat with you!",
                "얼굴 인식과 기본 대화가 가능합니다.",
            ],
        }
    
    def get_response(self, message: str) -> str:
        """사용자 메시지에 대한 응답 반환"""
        message_lower = message.lower()
        
        for pattern, responses in self.responses.items():
            if re.search(pattern, message_lower):
                return random.choice(responses)
        
        # 기본 응답
        default = [
            "흥미로운 질문이네요!",
            "다시 한번 말씀해 주실 수 있을까요?",
            "I see, tell me more!",
            "재미있는 말씀이네요!",
        ]
        
        return random.choice(default)
